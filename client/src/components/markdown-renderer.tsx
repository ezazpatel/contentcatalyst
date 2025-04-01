
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
    // Create a map of product codes to their associated images
    const productCodeToImageMap = new Map();
    const productCodeOccurrences = new Map();

    affiliateImages.forEach(img => {
      if (img.productCode && img.url) {
        productCodeToImageMap.set(img.productCode, img);
        productCodeOccurrences.set(img.productCode, 0);
      }
    });

    // Process the content line by line
    return content.split('\n').map(line => {
      // Check for affiliate URL markdown pattern [text](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        // Find the image that has this affiliate URL
        const matchingImage = affiliateImages.find(img => img.affiliateUrl === linkMatch[2]);
        
        if (matchingImage?.productCode) {
          const productCode = matchingImage.productCode;
          const count = productCodeOccurrences.get(productCode) || 0;
          productCodeOccurrences.set(productCode, count + 1);

          // If this is the second occurrence, add the image
          if (count === 1) {
            const image = productCodeToImageMap.get(productCode);
            return `${line}\n\n![${image.alt || ''}](${image.url})`;
          }
        }
      }
      return line;
    }).join('\n');
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
