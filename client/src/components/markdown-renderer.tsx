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
    // Build map of product code to image
    const productCodeToImage: Record<string, AffiliateImage> = {};
    affiliateImages.forEach(img => {
      if (img.productCode) {
        productCodeToImage[img.productCode] = img;
      }
    });

    // Helper to extract product code from URL
    const extractProductCodeFromUrl = (url: string): string | null => {
      const match = url.match(/\/tours\/[^/]+\/[^/]+\/([^/?\s]+)/);
      return match ? match[1] : null;
    };

    // Track occurrences of each product code
    const occurrences: Record<string, number> = {};

    // Process content line by line
    const lines = content.split('\n');
    return lines.map(line => {
      // Look for affiliate URLs in markdown links
      const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
      if (!linkMatches) return line;

      let modifiedLine = line;
      for (const linkMatch of linkMatches) {
        const urlMatch = linkMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (!urlMatch) continue;

        const [, , url] = urlMatch;
        const productCode = extractProductCodeFromUrl(url);
        if (!productCode) continue;

        occurrences[productCode] = (occurrences[productCode] || 0) + 1;

        // Insert image after second mention if we have one
        if (occurrences[productCode] === 2 && productCodeToImage[productCode]) {
          const img = productCodeToImage[productCode];
          modifiedLine = `${modifiedLine}\n\n![${img.alt || ''}](${img.url})`;
        }
      }
      return modifiedLine;
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