import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { csvUploadSchema } from "@shared/schema";
import Papa from "papaparse";

interface CSVUploadProps {
  onUpload: (data: Array<{
    keywords: string[];
    affiliateLinks: Array<{ name: string; url: string }>;
    scheduledDate: Date;
  }>) => void;
}

export function CSVUpload({ onUpload }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        try {
          const parsedData = results.data.map((row: any) => {
            const validated = csvUploadSchema.parse(row);
            return {
              keywords: validated.keywords.split(",").map((k) => k.trim()),
              affiliateLinks: [
                {
                  name: validated.affiliateName,
                  url: validated.affiliateUrl,
                },
              ],
              scheduledDate: new Date(validated.scheduledDate),
            };
          });

          onUpload(parsedData);
          toast({
            title: "Success",
            description: `Uploaded ${parsedData.length} items`,
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Invalid CSV format. Please check the template.",
            variant: "destructive",
          });
        }
      },
    });
  };

  const downloadTemplate = () => {
    const template = "keywords,affiliateName,affiliateUrl,scheduledDate\n" +
      "travel tips,Amazon Basics,https://amazon.com/basics,2024-12-31";
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blog-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()}>
          Upload CSV
        </Button>
        <Button variant="outline" onClick={downloadTemplate}>
          Download Template
        </Button>
      </div>
    </div>
  );
}
