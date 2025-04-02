import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AffiliateImage } from '@shared/schema';

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
    console.log('[MarkdownRenderer] Processing affiliate images');
    affiliateImages.forEach(img => {
      if (img.productCode) {
        console.log('[MarkdownRenderer] Mapping image to product code:', {
          productCode: img.productCode,
          imageUrl: img.url,
          alt: img.alt
        });
        productCodeToImage.set(img.productCode, img);
      }
    });

    console.log('[MarkdownRenderer] Available product codes:', 
      Array.from(productCodeToImage.keys())
    );

    // Process content line by line
    let modifiedContent = content;
    const productCodeOccurrences = new Map();

    const matches = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+viator\.com[^\)]*)\)/g)];

    for (const match of matches) {
      const [fullMatch, linkText, url] = match;

      try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
        const productCode = codeMatch ? codeMatch[1] : null;

        if (!productCode) continue;

        const count = productCodeOccurrences.get(productCode) || 0;
        productCodeOccurrences.set(productCode, count + 1);

        if (count === 1) { // skip first, inject after second
          const matchingImage = affiliateImages.find(img => img.productCode === productCode);
          if (matchingImage) {
            console.log('[Image Placement] Inserting image after second occurrence:', {
              productCode,
              imageUrl: matchingImage.url,
              alt: matchingImage.alt
            });
            const imageMarkdown = `\n\n![${matchingImage.alt || linkText}](${matchingImage.url})\n\n`;
            // insert image *after* the second link
            modifiedContent = modifiedContent.replace(fullMatch, `${fullMatch}${imageMarkdown}`);
          }
        }
      } catch (err) {
        console.error('[Image Insertion Error]', err);
      }
    }

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