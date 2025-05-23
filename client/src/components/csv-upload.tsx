import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { csvUploadSchema, InsertBlogPost } from "@shared/schema";
import Papa from "papaparse";
import { Upload, Download } from "lucide-react";

interface CSVUploadProps {
  onUpload: (data: InsertBlogPost[]) => void;
}

function generateProperTitle(keywords: string): string {
  // Remove special characters and extra spaces
  const cleanKeywords = keywords.replace(/[|]/g, " and ").trim();

  // Split into words and capitalize first letter of each significant word
  const words = cleanKeywords.split(" ");
  const properTitle = words
    .map((word, index) => {
      // Don't capitalize articles, conjunctions, and prepositions unless they're the first word
      const lowercaseWords = [
        "a",
        "an",
        "the",
        "and",
        "but",
        "or",
        "for",
        "nor",
        "on",
        "at",
        "to",
        "of",
        "in",
      ];
      if (index === 0 || !lowercaseWords.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(" ");

  // Add a meaningful prefix based on content type
  if (
    keywords.toLowerCase().includes("things to see") ||
    keywords.toLowerCase().includes("things to do")
  ) {
    return `Complete Guide to ${properTitle}`;
  } else if (keywords.toLowerCase().includes("itinerary")) {
    return `${properTitle}: Your Perfect Travel Guide`;
  } else {
    return `Ultimate Guide to ${properTitle}`;
  }
}

export function CSVUpload({ onUpload }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    toast({
      title: "Processing CSV",
      description: "Please wait while we process your file...",
    });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true, // Skip empty rows
      complete: (results) => {
        try {
          // Filter out rows where all fields are empty
          const nonEmptyRows = results.data.filter((row: any) =>
            Object.values(row).some((value) => value && String(value).trim()),
          );

          const processedData = nonEmptyRows.map((row: any, index: number) => {
            try {
              // Validate required fields
              if (!row["Primary Keyword"]?.trim()) {
                throw new Error("Primary Keyword is required");
              }

              if (!row["Scheduled Date"]?.trim()) {
                throw new Error("Scheduled Date is required");
              }

              // Process affiliate links
              const affiliateNames = row["Affiliate Product Names"]
                ? row["Affiliate Product Names"]
                    .split("|")
                    .map((name: string) => name.trim())
                : [];
              const affiliateUrls = row["Affiliate Product URLs"]
                ? row["Affiliate Product URLs"]
                    .split("|")
                    .map((url: string) => url.trim())
                : [];

              // Match affiliate names with URLs
              const affiliateLinks = affiliateNames
                .map((name: string, i: number) => ({
                  name,
                  url: affiliateUrls[i] || "",
                }))
                .filter((link) => link.name && link.url);

              // Combine date and time
              const date = row["Scheduled Date"].trim();
              const time = row["Scheduled Time"]?.trim() || "00:00";
              const scheduledDateTime = new Date(`${date} ${time}`);

              if (isNaN(scheduledDateTime.getTime())) {
                throw new Error(
                  "Invalid date/time format. Use YYYY-MM-DD for date and HH:MM for time",
                );
              }

              // Validate future date
              if (scheduledDateTime <= new Date()) {
                throw new Error("Scheduled date must be in the future");
              }

              // Generate a proper title if none provided
              const mainKeyword = row["Secondary Keyword"]?.trim() || row["Primary Keyword"];
              const title = row.Title?.trim() || generateProperTitle(mainKeyword);


              return {
                title,
                keywords: [row["Primary Keyword"]].filter(k => k?.trim()),
                secondaryKeywords: row["Secondary Keyword"] ? [row["Secondary Keyword"]].filter(k => k?.trim()) : [],
                content: "",
                status: "scheduled",
                scheduledDate: scheduledDateTime,
                affiliateLinks: [],
                affiliateImages: [], // ✅ <-- this line fixes the type error
              } as InsertBlogPost;
            } catch (error) {
              throw new Error(
                `Row ${index + 2}: ${error instanceof Error ? error.message : "Invalid data"}`,
              );
            }
          });

          onUpload(processedData);
          toast({
            title: "Success",
            description: `Successfully processed ${processedData.length} posts from CSV`,
          });

          // Clear the input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          console.error("CSV Processing Error:", error);
          toast({
            title: "Error Processing CSV",
            description:
              error instanceof Error
                ? error.message
                : "Please check if your CSV matches the template format",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description:
            "Could not read the CSV file. Please make sure it's properly formatted.",
          variant: "destructive",
        });
        setIsProcessing(false);
      },
    });
  };

  const downloadTemplate = () => {
    const template =
      "Primary Keyword,Secondary Keyword,Scheduled Date,Scheduled Time\n" +
      "vancouver attractions,vancouver hidden gems,2025-03-22,18:30";

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
        <Button
          variant="secondary"
          className="bg-black text-white hover:bg-gray-900"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isProcessing ? "Processing..." : "Upload CSV"}
        </Button>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>
    </div>
  );
}
