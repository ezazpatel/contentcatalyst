import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ProductSlideshow from './product-slideshow';
import { AffiliateImage } from '@shared/schema';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  // Process content for product slideshows first
  const processedContent = React.useMemo(() => {
    const lines = content.split('\n');
    const newLines: string[] = [];
    let currentSlideshow: AffiliateImage[] = [];
    let inSlideshow = false;

    for (const line of lines) {
      if (line.includes('<div class="product-slideshow">')) {
        inSlideshow = true;
        currentSlideshow = [];
        continue;
      }

      if (line.includes('</div>') && inSlideshow) {
        inSlideshow = false;
        if (currentSlideshow.length > 0) {
          newLines.push(`<ProductSlideshow images={${JSON.stringify(currentSlideshow)}} productCode="inline" />`);
        }
        continue;
      }

      if (inSlideshow) {
        const imgMatch = line.match(/<img src="([^"]+)" alt="([^"]+)" \/>/);
        if (imgMatch) {
          currentSlideshow.push({
            url: imgMatch[1],
            alt: imgMatch[2],
            affiliateUrl: '',
            heading: '',
            cached: false
          });
        }
        continue;
      }

      newLines.push(line);
    }
    return newLines.join('\n');
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