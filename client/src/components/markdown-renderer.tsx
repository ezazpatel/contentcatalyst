
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ProductSlideshow } from './product-slideshow';
import type { AffiliateImage } from '@shared/schema';

interface Props {
  content: string;
  images: AffiliateImage[];
}

function getProductCode(url: string): string {
  return url.split('/').pop() || '';
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

  // Track used codes to prevent duplicate rendering
  const usedCodes = new Set<string>();

  // Process content line by line
  const lines = contentWithoutTitle.split('\n');
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineKey = `line-${i}`;

    // Handle heading capitalization
    const processedLine = line.startsWith('## ') ? capitalizeWords(line) : line;

    // Check for product links in the line
    const linkMatches = Array.from(line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g));
    
    // Add the markdown line
    elements.push(
      <ReactMarkdown 
        key={`${lineKey}-md`}
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
      >
        {processedLine}
      </ReactMarkdown>
    );

    // Add slideshow after the line containing the product link
    for (const match of linkMatches) {
      const [_, linkText, url] = match;
      if (!url?.trim()) continue;
      
      const code = getProductCode(url);
      if (!code) continue;

      if (!usedCodes.has(code) && imagesByCode[code]?.length > 0) {
        usedCodes.add(code);
        elements.push(
          <ProductSlideshow 
            key={`${lineKey}-slideshow-${code}`} 
            images={imagesByCode[code]} 
            productCode={code} 
          />
        );
      }
    }
  }

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      {elements}
    </div>
  );
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (match) => match.toUpperCase());
}
