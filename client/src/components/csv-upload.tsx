
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { csvUploadSchema } from "@shared/schema";
import Papa from "papaparse";

interface CSVUploadProps {
  onUpload: (data: any[]) => void;
}

export function CSVUpload({ onUpload }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const processedData = results.data.map((row: any) => {
            const validatedRow = csvUploadSchema.parse(row);
            
            return {
              title: `Blog Post About ${validatedRow.keywords}`,
              keywords: validatedRow.keywords.split(',').map(k => k.trim()),
              description: validatedRow.description || '',
              seoTitle: validatedRow.seoTitle || '',
              seoDescription: validatedRow.seoDescription || '',
              status: 'scheduled',
              scheduledDate: new Date(validatedRow.scheduledDate),
              affiliateLinks: validatedRow.affiliateName ? [{
                name: validatedRow.affiliateName,
                url: validatedRow.affiliateUrl
              }] : [],
              internalLinks: validatedRow.internalLinkTitle ? [{
                title: validatedRow.internalLinkTitle,
                url: validatedRow.internalLinkUrl,
                description: validatedRow.internalLinkDesc
              }] : []
            };
          });

          onUpload(processedData);
          toast({
            title: "Success",
            description: `Uploaded ${processedData.length} posts for processing`,
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Invalid CSV format: " + error.message,
            variant: "destructive",
          });
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description: "Failed to parse CSV: " + error.message,
          variant: "destructive",
        });
      }
    });
  };

  const downloadTemplate = () => {
    const template = "keywords,affiliateName,affiliateUrl,scheduledDate,description,seoTitle,seoDescription,internalLinkTitle,internalLinkUrl,internalLinkDesc\n" +
      "travel tips,Amazon Basics,https://amazon.com/basics,2024-12-31,Travel tips for beginners,Best Travel Tips 2024,Learn essential travel tips,Related Travel Guide,https://example.com/guide,Comprehensive guide";
    
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
