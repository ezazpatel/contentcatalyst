import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { csvUploadSchema, InsertBlogPost } from "@shared/schema";
import Papa from "papaparse";

interface CSVUploadProps {
  onUpload: (data: InsertBlogPost[]) => void;
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
            // First validate the CSV row structure
            const validatedRow = csvUploadSchema.parse(row);

            // Process affiliate links - split both names and URLs and match them
            const affiliateNames = validatedRow.affiliateName ? validatedRow.affiliateName.split(',').map(name => name.trim()) : [];
            const affiliateUrls = validatedRow.affiliateUrl ? validatedRow.affiliateUrl.split(',').map(url => url.trim()) : [];

            // Create affiliate links array by matching names with URLs
            const affiliateLinks = affiliateNames.map((name, index) => ({
              name,
              url: affiliateUrls[index] || '' // Use empty string if no matching URL found
            })).filter(link => link.name && link.url); // Filter out incomplete pairs

            // Transform CSV data to match BlogPost structure
            return {
              title: `Blog Post About ${validatedRow.keywords}`,
              // Keep keywords in a single array for one article
              keywords: validatedRow.keywords.split(',').map(k => k.trim()),
              content: "", // Content will be generated by the AI
              status: 'scheduled',
              description: validatedRow.description || '',
              seoTitle: validatedRow.seoTitle || '',
              seoDescription: validatedRow.seoDescription || '',
              scheduledDate: new Date(validatedRow.scheduledDate),
              affiliateLinks: affiliateLinks,
              internalLinks: validatedRow.internalLinkTitle ? [{
                title: validatedRow.internalLinkTitle,
                url: validatedRow.internalLinkUrl || '',
                description: validatedRow.internalLinkDesc
              }] : []
            } as InsertBlogPost;
          });

          // Validate all scheduled dates are in the future
          const now = new Date();
          processedData.forEach(post => {
            if (new Date(post.scheduledDate) <= now) {
              throw new Error(`Scheduled date must be in the future for keywords: ${post.keywords.join(", ")}`);
            }
          });

          onUpload(processedData);
          toast({
            title: "Success",
            description: `Uploaded ${processedData.length} posts for processing`,
          });

          // Clear the input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error("CSV Processing Error:", error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Invalid CSV format",
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
    const template = "Keywords,Affiliate Product Name,Affiliate Product URL,Scheduled Date,Blog Description,SEO Title,SEO Description,Internal Link Title,Internal Link URL,Internal Link Description\n" +
      "travel tips canada,Amazon Basics Travel Kit|Travel Pillow Set,https://amazon.com/basics-kit|https://amazon.com/pillow,2024-12-31,Travel tips for beginners,Best Travel Tips 2024,Learn essential travel tips,Related Travel Guide,https://example.com/guide,Comprehensive guide";

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
        <Button variant="secondary" className="bg-black text-white hover:bg-gray-900" onClick={() => fileInputRef.current?.click()}>
          Upload CSV
        </Button>
        <Button variant="outline" onClick={downloadTemplate}>
          Download Template
        </Button>
      </div>
    </div>
  );
}