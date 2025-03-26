
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

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (match) => match.toUpperCase());
}

function getProductCode(url: string): string {
  return url.split('/').pop() || '';
}

export function MarkdownRenderer({ content, images }: Props) {
  // Remove title and empty lines at start
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

  // Track used codes and first occurrences
  const usedCodes = new Set<string>();
  const firstOccurrence = new Set<string>();

  // Process content line by line
  const processedLines = contentWithoutTitle.split('\n').map((line, index) => {
    let elements: JSX.Element[] = [];
    const lineKey = `line-${index}`;

    // Handle heading capitalization
    const processedLine = line.startsWith('## ') ? capitalizeWords(line) : line;
    
    // Add the markdown line
    elements.push(
      <ReactMarkdown key={`${lineKey}-md`} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {processedLine}
      </ReactMarkdown>
    );

    // Handle product slideshows
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
        elements.push(
          <ProductSlideshow key={`${lineKey}-slideshow-${code}`} images={imagesByCode[code]} productCode={code} />
        );
      }
    }

    return elements;
  }).flat();

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      {processedLines}
    </div>
  );
}
