
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
    // Create a map of product codes to their images
    const productCodeToImage = new Map();
    const productCodeOccurrences = new Map();

    affiliateImages.forEach(img => {
      if (img.productCode && img.url) {
        productCodeToImage.set(img.productCode, img);
      }
    });

    // Process content line by line
    return content.split('\n').map(line => {
      // Check for affiliate URL markdown pattern [text](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [fullMatch, linkText, affiliateUrl] = linkMatch;
        
        // Find the image that has this affiliate URL
        const matchingImage = affiliateImages.find(img => img.affiliateUrl === affiliateUrl);
        
        if (matchingImage?.productCode) {
          const count = productCodeOccurrences.get(matchingImage.productCode) || 0;
          productCodeOccurrences.set(matchingImage.productCode, count + 1);

          // If this is the second occurrence of this product code
          if (count === 1) {
            return `${line}\n\n![${matchingImage.alt || linkText}](${matchingImage.url})`;
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
