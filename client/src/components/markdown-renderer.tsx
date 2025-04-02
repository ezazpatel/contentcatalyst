import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AffiliateImage } from '@shared/schema';

// Verify affiliate image structure
const isValidAffiliateImage = (img: AffiliateImage): boolean => {
  return !!img && typeof img === 'object' && 'productCode' in img && !!img.productCode;
};

interface MarkdownRendererProps {
  content: string;
  affiliateImages?: AffiliateImage[];
}

export function MarkdownRenderer({ content, affiliateImages = [] }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    console.log('[MarkdownRenderer] Starting content processing', {
      contentLength: content?.length || 0,
      availableImages: affiliateImages?.length || 0
    });

    // Create maps to track product codes and their images
    const productCodeToImage = new Map();
    const productCodeOccurrences = new Map();

    // Map product codes to their images
    console.log('[MarkdownRenderer] Processing affiliate images:', affiliateImages);
    affiliateImages.forEach(img => {
      console.log('[MarkdownRenderer] Processing image:', {
        productCode: img.productCode,
        imageUrl: img.url,
        alt: img.alt
      });
      if (img.productCode) {
        productCodeToImage.set(img.productCode, img);
      }
    });

    const availableCodes = Array.from(productCodeToImage.keys());
    console.log('[MarkdownRenderer] Available product codes:', availableCodes);
    if (availableCodes.length === 0) {
      console.warn('[MarkdownRenderer] No product codes found in affiliate images');
    }

    // Process content line by line
    let modifiedContent = '';
    let lastIndex = 0;
    const matches = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+viator\.com[^\)]*)\)/g)];

    console.log('[DEBUG: All Viator Matches]', matches.map(m => m[2]));

    matches.forEach(match => {
      const [fullMatch, linkText, url] = match;
      const start = match.index!;
      const end = start + fullMatch.length;

      // Extract product code
      let productCode = '';
      try {
        const urlObj = new URL(url);
        const lastSegment = urlObj.pathname.split('/').filter(Boolean).pop() || '';
        const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
        productCode = codeMatch?.[1] || '';
      } catch (e) {
        console.warn('Skipping bad URL:', url);
      }

      // Always include the current chunk
      modifiedContent += content.slice(lastIndex, end);

      // Image insertion logic
      if (productCode) {
        const count = productCodeOccurrences.get(productCode) || 0;
        productCodeOccurrences.set(productCode, count + 1);

        if (count === 1 && productCodeToImage.has(productCode)) {
          const image = productCodeToImage.get(productCode)!;
          const imageMarkdown = `\n\n![${image.alt || linkText}](${image.url})\n\n`;
          modifiedContent += imageMarkdown;
        }
      }

      lastIndex = end;
    });

    modifiedContent += content.slice(lastIndex);

    console.log('[DEBUG] Final processedContent snippet:');
    console.log(modifiedContent.slice(0, 1000));
    return modifiedContent;
  }, [content, affiliateImages]);

  return (
    <div className="prose prose-lg max-w-none prose-img:max-w-full prose-img:mx-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}