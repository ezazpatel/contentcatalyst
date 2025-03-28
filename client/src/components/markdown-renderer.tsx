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
    // Remove markdown images since we'll use affiliate images instead
    let cleanContent = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');

    // Group affiliate images by heading
    const imagesByHeading = affiliateImages.reduce((acc, img) => {
      if (!acc[img.heading]) {
        acc[img.heading] = [];
      }
      acc[img.heading].push(img);
      return acc;
    }, {} as Record<string, AffiliateImage[]>);

    // Insert images under their respective headings
    const sections = cleanContent.split(/^##\s+/m);
    const processedSections = sections.map((section, index) => {
      if (index === 0) return section;

      const [heading, ...rest] = section.split('\n');
      const sectionContent = rest.join('\n');
      const sectionImages = imagesByHeading[heading] || [];

      const imageMarkdown = sectionImages
        .map(img => `![${img.alt}](${img.url})`)
        .join('\n\n');

      return `## ${heading}\n\n${imageMarkdown}\n\n${sectionContent}`;
    });

    return processedSections.join('\n\n');
  }, [content, affiliateImages]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      className="prose prose-lg max-w-none"
    >
      {processedContent}
    </ReactMarkdown>
  );
}