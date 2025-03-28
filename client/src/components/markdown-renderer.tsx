
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
    let currentImageIndex = 0;
    const lines = content.split('\n');
    
    // Process content line by line
    const processedLines = lines.map(line => {
      // If line contains a Viator URL
      if (line.includes('viator.com/tours/')) {
        currentImageIndex++;
        // On second occurrence of a Viator URL, add an image
        if (currentImageIndex % 2 === 0 && affiliateImages[currentImageIndex - 1]) {
          const image = affiliateImages[currentImageIndex - 1];
          return `${line}\n\n![${image.alt || ''}](${image.url})`;
        }
      }
      return line;
    });

    // Handle any remaining undefined image placeholders
    const finalContent = processedLines.join('\n').replace(/!\[([^\]]*)\]\(undefined\)/g, () => {
      const image = affiliateImages[currentImageIndex];
      currentImageIndex = (currentImageIndex + 1) % affiliateImages.length;
      return image ? `![${image.alt || ''}](${image.url})` : '';
    });

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
