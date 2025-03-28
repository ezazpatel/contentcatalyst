import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AffiliateImage } from '@shared/schema';

interface MarkdownRendererProps {
  content: string;
  affiliateImages?: AffiliateImage[];
}

export function MarkdownRenderer({ content, affiliateImages }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    // Remove the title (first heading) from content
    let processedContent = content.replace(/^#\s+.*\n/, '');

    // Split content into sections by H2 headings
    const sections = processedContent.split(/^##\s+/m);

    // Process each section
    const processedSections = sections.map((section, index) => {
      if (index === 0) return section;

      // Extract the heading and content
      const [heading, ...contentParts] = section.split('\n');
      const sectionContent = contentParts.join('\n');

      // If there's a matching affiliate image, insert it
      if (affiliateImages && index <= affiliateImages.length) {
        const img = affiliateImages[index - 1];
        if (img) {
          return `## ${heading}\n\n![${img.alt}](${img.url})\n\n${sectionContent}`;
        }
      }

      return `## ${heading}\n\n${sectionContent}`;
    });

    return processedSections.join('\n\n');
  }, [content, affiliateImages]);

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
        components={{
          img: ({node, alt, src, ...props}) => (
            <img 
              src={src} 
              alt={alt || ''} 
              className="w-full max-w-full h-auto rounded-lg my-4"
              loading="lazy"
              {...props}
            />
          ),
          p: ({node, children}) => (
            <p className="my-4">{children}</p>
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}