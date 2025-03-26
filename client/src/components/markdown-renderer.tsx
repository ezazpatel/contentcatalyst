
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ProductSlideshow from './product-slideshow';
import type { AffiliateImage } from '@shared/schema';

interface Props {
  content: string;
  images: AffiliateImage[];
}

function getProductCode(url: string): string {
  return url.split('/').pop() || '';
}

function capitalizeWords(text: string): string {
  return text.replace(/^## (.+)/, (_match, words) => 
    `## ${words.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')}`
  );
}

export function MarkdownRenderer({ content, images }: Props) {
  const contentWithoutTitle = content.replace(/^#\s+.*\n+/, '');
  
  // Group images by product code
  const imagesByCode = images.reduce((acc, img) => {
    const code = getProductCode(img.affiliateUrl);
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(img);
    return acc;
  }, {} as Record<string, AffiliateImage[]>);

  // Track first occurrences and used codes
  const firstOccurrence = new Set<string>();
  const usedCodes = new Set<string>();

  // Process content line by line
  const lines = contentWithoutTitle.split('\n');
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineKey = `line-${i}`;
    
    // Check for product links in the line
    const linkMatches = Array.from(line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g));
    
    for (const [_, __, url] of linkMatches) {
      const code = getProductCode(url);
      
      if (!firstOccurrence.has(code)) {
        firstOccurrence.add(code);
        continue;
      }

      if (!usedCodes.has(code) && imagesByCode[code]?.length > 0) {
        usedCodes.add(code);
        elements.push(
          <div key={`${lineKey}-slideshow`} className="my-4">
            <ProductSlideshow images={imagesByCode[code]} />
          </div>
        );
      }
    }

    // Handle heading capitalization
    const processedLine = line.startsWith('## ') ? capitalizeWords(line) : line;
    
    elements.push(
      <ReactMarkdown 
        key={`${lineKey}-md`}
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
      >
        {processedLine}
      </ReactMarkdown>
    );
  }

  return <>{elements}</>;
}
