import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
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
    
    // Split content into sections by H2 headings
    const sections = content.split(/^##\s+/m);
    console.log('MarkdownRenderer: Found sections:', sections.length);

    // Process each section (skip the first one as it's the intro)
    return sections.map((section, index) => {
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
    }).join('');
  }, [content]);

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