import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  affiliateImages?: Array<{
    url: string;
    alt: string;
    heading: string;
  }>;
}

export function MarkdownRenderer({ content, affiliateImages = [] }: MarkdownRendererProps) {
  console.log('MarkdownRenderer: Content received:', content.substring(0, 100) + '...');

  const processedContent = React.useMemo(() => {
    console.log('MarkdownRenderer: Processing content');

    // Count all images in content
    const allImages = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
    console.log('MarkdownRenderer: Found images:', {
      totalImages: allImages.length,
      imageUrls: allImages.map(img => {
        const match = img.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        return match ? match[2] : null;
      })
    });

    // Add affiliate images to content
    let contentWithAffiliateImages = content;
    if (affiliateImages && affiliateImages.length > 0) {
      contentWithAffiliateImages = affiliateImages.reduce((acc, img) => {
        return `${acc}\n\n## ${img.heading}\n\n![${img.alt}](${img.url})\n\n`;
      }, content);
    }

    // Split content into sections by H2 headings
    const sections = contentWithAffiliateImages.split(/^##\s+/m);
    console.log('MarkdownRenderer: Found sections:', sections.length);

    // Process each section (skip the first one as it's the intro)
    const sectionsWithAffiliateImages = sections.map((section, index) => {
      if (index === 0) return section;

      // Find the first image in the section
      const imgMatch = section.match(/!\[([^\]]*)\]\(([^)]+)\)/);

      if (imgMatch) {
        // Keep only the first image, remove others
        const cleanedSection = section.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');
        const [heading, ...rest] = cleanedSection.split('\n');
        return `## ${heading}\n\n![${imgMatch[1]}](${imgMatch[2]})\n\n${rest.join('\n')}`;
      }

      return `## ${section}`;
    });

    // Add affiliate images to the processed content
    const finalContent = sectionsWithAffiliateImages.join('');
    const contentWithAffiliateImages = affiliateImages.reduce((acc, img) => {
      return `${acc}## ${img.heading}\n\n![${img.alt}](${img.url})\n\n`;
    }, finalContent);


    return contentWithAffiliateImages;
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