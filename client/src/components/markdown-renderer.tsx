
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
    // Create maps to track product codes and their images
    const productCodeOccurrences: { [key: string]: number } = {};
    const productCodeToImage: { [key: string]: AffiliateImage } = {};
    
    // Map images to their product codes
    affiliateImages.forEach(img => {
      if (img.affiliateUrl) {
        const match = img.affiliateUrl.match(/viator\.com\/tours\/[^\/]+\/[^\/]+\/([^\/\-]+)/);
        if (match) {
          productCodeToImage[match[1]] = img;
        }
      }
    });

    const lines = content.split('\n');
    
    // Process content line by line
    const processedLines = lines.map(line => {
      // Check for Viator URLs and extract product code
      const match = line.match(/viator\.com\/tours\/[^\/]+\/[^\/]+\/([^\/\-]+)/);
      if (match) {
        const productCode = match[1];
        productCodeOccurrences[productCode] = (productCodeOccurrences[productCode] || 0) + 1;
        
        // On second occurrence of this specific product code, add its image
        if (productCodeOccurrences[productCode] === 2 && productCodeToImage[productCode]) {
          const image = productCodeToImage[productCode];
          return `${line}\n\n![${image.alt || ''}](${image.url})`;
        }
      }
      return line;
    });

    // Remove any remaining undefined image placeholders
    const finalContent = processedLines.join('\n').replace(/!\[([^\]]*)\]\(undefined\)/g, '');

    return finalContent;
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
