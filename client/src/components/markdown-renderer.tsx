
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AffiliateImage } from "@shared/schema";
import ProductSlideshow from "@/components/product-slideshow";

interface Props {
  content: string;
  images: AffiliateImage[];
}

export function MarkdownRenderer({ content, images }: Props) {
  const [renderedContent, setRenderedContent] = React.useState<string>('');

  React.useEffect(() => {
    const lines = content.split('\n');
    const newLines: string[] = [];
    const usedCodes = new Set<string>();
    const firstOccurrence = new Set<string>();

    // Group images by product code
    const imagesByCode = images.reduce((acc, img) => {
      const urlParts = new URL(img.affiliateUrl).pathname.split('/');
      const code = urlParts[urlParts.length - 1];
      if (!acc[code]) {
        acc[code] = [];
      }
      acc[code].push(img);
      return acc;
    }, {} as Record<string, AffiliateImage[]>);

    for (const line of lines) {
      newLines.push(line);

      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;
        const urlParts = new URL(url).pathname.split('/');
        const code = urlParts[urlParts.length - 1];
        
        if (!firstOccurrence.has(code)) {
          firstOccurrence.add(code);
          continue;
        }

        if (!usedCodes.has(code) && imagesByCode[code]?.length > 0) {
          usedCodes.add(code);
          newLines.push('');
          newLines.push(`<div class="product-slideshow">`);
          imagesByCode[code].forEach(img => {
            newLines.push(`<img src="${img.url}" alt="${img.alt}" />`);
          });
          newLines.push('</div>');
          newLines.push('');
        }
      }
    }

    setRenderedContent(newLines.join('\n'));
  }, [content, images]);

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}
