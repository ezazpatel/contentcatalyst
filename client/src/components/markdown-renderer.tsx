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
      console.log(`Processing section with heading: "${heading}"`);
      const sectionImages = imagesByHeading[heading] || [];
      console.log('Images for this section:', sectionImages);

      const imageMarkdown = sectionImages
        .filter(img => {
          const isValid = img && typeof img.url === 'string' && img.url.length > 0 && img.url !== 'undefined';
          if (!isValid) {
            console.warn('Skipping invalid image:', img);
          }
          return isValid;
        })
        .map(img => {
          const alt = img.alt?.trim() || '';
          const url = img.url.trim();
          console.log('Creating markdown for image:', { alt, url });
          return `![${alt}](${url})`;
        })
        .join('\n\n');

      return `## ${heading}\n\n${imageMarkdown}\n\n${sectionContent}`;
    });

    return processedSections.join('\n\n');
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