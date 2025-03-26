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

import { getProductCode } from '@/utils/url-helpers';

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function MarkdownRenderer({ content, images }: Props) {
  // Remove title and empty lines at start
  const contentWithoutTitle = content.replace(/^#\s+.*\n+/, '');
  const lines = contentWithoutTitle.split('\n');
  const newLines: (string | JSX.Element)[] = [];
  const usedCodes = new Set<string>();
  const firstOccurrence = new Set<string>();
  
  // Group images by product code
  const imagesByCode = images.reduce((acc, img) => {
    const code = getProductCode(img.affiliateUrl);
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(img);
    return acc;
  }, {} as Record<string, AffiliateImage[]>);

  for (const line of lines) {
    // Create a more unique key using line content and position
    const lineKey = `md-${line.trim().substring(0, 20)}-${newLines.length}`;
    
    newLines.push(
      <ReactMarkdown key={lineKey} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {line.startsWith('## ') ? capitalizeWords(line) : line}
      </ReactMarkdown>
    );


    const linkMatches = Array.from(line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g));
    for (const match of linkMatches) {
      const [_, linkText, url] = match;
      if (!url?.trim()) continue;
      const code = getProductCode(url);
      if (!code) continue;

      if (!firstOccurrence.has(code)) {
        firstOccurrence.add(code);
        continue;
      }

      if (!usedCodes.has(code) && imagesByCode[code]?.length > 0) {
        usedCodes.add(code);
        newLines.push(
          <ProductSlideshow key={`slideshow-${code}`} images={imagesByCode[code]} productCode={code} />
        );
      }
    }
  }

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      {newLines}
    </div>
  );
}