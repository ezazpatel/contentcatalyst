
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AffiliateImage } from '@shared/schema';

interface MarkdownRendererProps {
  content: string;
  affiliateImages?: AffiliateImage[];
}

interface MarkdownRendererProps {
  content: string;
  affiliateImages?: AffiliateImage[];
  affiliateLinks?: { name: string; url: string }[];
}

export function MarkdownRenderer({ content, affiliateImages = [], affiliateLinks = [] }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    // Create maps to track occurrences and images
    const linkOccurrences: { [url: string]: number } = {};
    const urlToImage: { [url: string]: AffiliateImage } = {};
    
    // Map images to their productCodes
    affiliateLinks.forEach((link, index) => {
      if (link.url && affiliateImages[index]) {
        // Extract product code from affiliate URL
        const match = link.url.match(/viator\.com\/tours\/[^\/]+\/[^\/]+\/([^\/\-]+)/);
        if (match && match[1] === affiliateImages[index].productCode) {
          urlToImage[link.url] = affiliateImages[index];
        }
      }
    });

    const lines = content.split('\n');
    
    // Process content line by line
    const processedLines = lines.map(line => {
      // Look for affiliate URLs in the line
      for (const link of affiliateLinks) {
        if (line.includes(link.url)) {
          linkOccurrences[link.url] = (linkOccurrences[link.url] || 0) + 1;
          
          // On second occurrence of this URL, add its corresponding image
          if (linkOccurrences[link.url] === 2 && urlToImage[link.url]) {
            const image = urlToImage[link.url];
            return `${line}\n\n![${image.alt || ''}](${image.url})`;
          }
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
