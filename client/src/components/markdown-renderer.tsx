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
    // Create a map of affiliate URLs to their associated images
    const urlToImageMap = new Map();
    const urlOccurrences = new Map();

    affiliateImages.forEach(img => {
      if (img.affiliateUrl && img.url) {
        urlToImageMap.set(img.affiliateUrl, img);
        urlOccurrences.set(img.affiliateUrl, 0);
      }
    });

    // Process the content line by line
    return content.split('\n').map(line => {
      // Check for affiliate URL markdown pattern [text](url)
      const urlMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (urlMatch && urlToImageMap.has(urlMatch[2])) {
        const url = urlMatch[2];
        const count = urlOccurrences.get(url) || 0;
        urlOccurrences.set(url, count + 1);

        // If this is the second occurrence, add the image
        if (count === 1) {
          const image = urlToImageMap.get(url);
          return `${line}\n\n![${image.alt || ""}](${image.url})`;
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