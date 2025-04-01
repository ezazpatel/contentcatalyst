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
    // Build map of product codes to affiliate images
    const productCodeToImage = new Map(
      affiliateImages.map(img => [img.productCode, img])
    );

    // Track occurrences of each product code
    const productCodeCount = new Map<string, number>();

    // Process content line by line
    return content.split('\n').map(line => {
      // Look for markdown links [text](url)
      const linkMatch = line.match(/\[([^\]]*)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;
        // Extract product code from URL
        const urlPath = url.split('?')[0]; // Strip query params
        const productCode = urlPath.split('/').pop()?.replace(/^d\d+-/, ''); // Remove d###- prefix if present
        
        if (productCode && productCodeToImage.has(productCode)) {
          // Increment count for this product code
          const count = (productCodeCount.get(productCode) || 0) + 1;
          productCodeCount.set(productCode, count);

          // If this is the second occurrence, add the image
          if (count === 2) {
            const image = productCodeToImage.get(productCode)!;
            return `${line}\n![${image.alt || linkText}](${image.url})`;
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