
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AffiliateImage } from '@shared/schema';

interface MarkdownRendererProps {
  content: string;
  affiliateImages?: AffiliateImage[];
}

export function MarkdownRenderer({ content, affiliateImages = [] }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    // Create a map to track affiliate URL occurrences
    const urlOccurrences: { [key: string]: number } = {};
    
    // First pass: Count affiliate URL occurrences and extract product codes
    const productCodePattern = /viator\.com\/tours\/[^\/]+\/[^\/]+\/([^\/\-]+)/;
    const lines = content.split('\n');
    const imagesByProductCode = new Map<string, AffiliateImage>();
    
    // Map images to product codes from their affiliate URLs
    affiliateImages.forEach(img => {
      if (img.affiliateUrl) {
        const match = img.affiliateUrl.match(productCodePattern);
        if (match) {
          imagesByProductCode.set(match[1], img);
        }
      }
    });

    // Process content line by line
    const processedLines = lines.map(line => {
      // Check if line contains a Viator URL
      const urlMatch = line.match(productCodePattern);
      if (urlMatch) {
        const productCode = urlMatch[1];
        // Increment occurrence counter
        urlOccurrences[productCode] = (urlOccurrences[productCode] || 0) + 1;
        
        // If this is the second occurrence and we have a matching image
        if (urlOccurrences[productCode] === 2 && imagesByProductCode.has(productCode)) {
          const image = imagesByProductCode.get(productCode);
          // Add image after the line with the URL
          return `${line}\n\n![${image.alt || ''}](${image.url})`;
        }
      }
      
      // Return unmodified line if no special handling needed
      return line;
    });

    // Replace remaining unplaced images with cyclic pattern
    let currentImageIndex = 0;
    const remainingImages = affiliateImages.filter(img => {
      const match = img.affiliateUrl?.match(productCodePattern);
      return !match || !urlOccurrences[match[1]] || urlOccurrences[match[1]] < 2;
    });

    return processedLines.join('\n').replace(/!\[([^\]]*)\]\([^)]+\)/g, () => {
      if (remainingImages.length === 0) return '';
      const image = remainingImages[currentImageIndex];
      currentImageIndex = (currentImageIndex + 1) % remainingImages.length;
      return `![${image.alt || ''}](${image.url})`;
    });
  }, [content, affiliateImages]);

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
