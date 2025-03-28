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

    // Replace markdown image placeholders with actual affiliate images
    return content.replace(/!\[([^\]]*)\]\([^)]+\)/g, () => {
      const image = affiliateImages[currentImageIndex];
      currentImageIndex = (currentImageIndex + 1) % affiliateImages.length;

      if (!image?.url) {
        return '';
      }

      return `![${image.alt || ''}](${image.url})`;
    });
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