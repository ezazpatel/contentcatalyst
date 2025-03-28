import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ProductSlideshow from './product-slideshow';
import { AffiliateImage } from '@shared/schema';

interface Props {
  content: string;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function MarkdownRenderer({ content }: Props) {
  // Filter out all H1 headings
  const lines = content.split('\n').filter(line => !line.trim().startsWith('# '));
  const newLines: (string | JSX.Element)[] = [];

  // Process slideshow divs
  let currentSlideshow: AffiliateImage[] = [];
  let inSlideshow = false;

  for (const line of lines) {
    const lineKey = `md-${line.trim().substring(0, 20)}-${newLines.length}`;

    if (line.includes('<div class="product-slideshow">')) {
      inSlideshow = true;
      currentSlideshow = [];
      continue;
    }

    if (line.includes('</div>') && inSlideshow) {
      inSlideshow = false;
      if (currentSlideshow.length > 0) {
        newLines.push(
          <ProductSlideshow 
            key={`slideshow-${newLines.length}`}
            images={currentSlideshow}
            productCode="inline"
          />
        );
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

    if (line.startsWith('## ')) {
      const heading = capitalizeWords(line.substring(3));
      newLines.push(
        <h2 key={lineKey}>{heading}</h2>
      );
    } else {
      //Modified to handle images directly within ReactMarkdown
      newLines.push(
        <ReactMarkdown key={lineKey} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
          img: ({node, alt, src, ...props}) => (
            <figure className="my-4">
              <img 
                src={src} 
                alt={alt} 
                className="max-w-full h-auto rounded-lg mx-auto"
                loading="lazy"
                {...props}
              />
              {alt && <figcaption className="text-center text-sm text-gray-500 mt-2">{alt}</figcaption>}
            </figure>
          )
        }}>
          {line}
        </ReactMarkdown>
      );
    }
  }

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      {newLines}
    </div>
  );
}