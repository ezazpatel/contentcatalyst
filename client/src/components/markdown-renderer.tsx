
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
    const productCodeToImage = new Map();
    const productCodeOccurrences = new Map();

    // Map product codes to their images
    affiliateImages.forEach(img => {
      if (img.productCode) {
        productCodeToImage.set(img.productCode, img);
      }
    });

    // Process content line by line
    return content.split('\n').map(line => {
      // Check for affiliate URL markdown pattern [text](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;
        
        // Only process Viator affiliate URLs
        if (url.includes('viator.com')) {
          // Extract product code using consistent logic
          const urlParts = url.split('/').filter(Boolean);
          const lastSegment = urlParts[urlParts.length - 1];
          const codeMatch = lastSegment.match(/(?:d\d+-)?(.+?)(?:\.html)?$/);
          const productCode = codeMatch?.[1];

          console.log('[Product Code Debug]', {
            url,
            lastSegment,
            extractedCode: productCode,
            matchResult: codeMatch
          });

          if (productCode) {
            // Find matching image by exact product code
            const matchingImage = affiliateImages.find(img => 
              img.productCode && img.productCode === productCode
            );

            if (matchingImage) {
              const count = productCodeOccurrences.get(productCode) || 0;
              productCodeOccurrences.set(productCode, count + 1);

              // Add image after second occurrence of affiliate link
              if (count >= 1) {
                return `${line}\n\n![${matchingImage.alt || linkText}](${matchingImage.url})`;
              }
            }
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
