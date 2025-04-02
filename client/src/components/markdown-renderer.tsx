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
    // Create maps for product codes
    const productCodeToImage = new Map();
    const productCodeOccurrences = new Map();

    // Map product codes to their images
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
        const [_, linkText, affiliateUrl] = linkMatch;

        // Find matching image by product code
        const matchingImage = affiliateImages.find(img => 
          img.affiliateUrl === affiliateUrl && img.productCode
        );

        if (matchingImage?.productCode) {
          const count = productCodeOccurrences.get(matchingImage.productCode) || 0;
          productCodeOccurrences.set(matchingImage.productCode, count + 1);

          // Only add image after second occurrence (skip first)
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