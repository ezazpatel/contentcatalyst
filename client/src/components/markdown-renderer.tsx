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

    const productCodeToImage = new Map<string, AffiliateImage>();
    affiliateImages.forEach(img => {
      if (img.productCode) {
        productCodeToImage.set(img.productCode, img);
      }
    });

    const productCodeOccurrences = new Map<string, number>();
    const paragraphs = content.split(/\n{2,}/);
    const modifiedParagraphs: string[] = [];

    paragraphs.forEach((paragraph) => {
      const matches = [...paragraph.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+viator\.com[^\)]*)\)/g)];
      let modifiedPara = paragraph;
      let imagesToInsert: string[] = [];

      matches.forEach(([fullMatch, linkText, url]) => {
        try {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          const lastSegment = pathSegments[pathSegments.length - 1];
          const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
          const productCode = codeMatch ? codeMatch[1] : null;

          if (!productCode) return;

          const count = productCodeOccurrences.get(productCode) || 0;

          if (count === 0) {
            productCodeOccurrences.set(productCode, 1); // keep first appearance
          } else if (count === 1) {
            productCodeOccurrences.set(productCode, 2); // keep second + insert image
            const img = productCodeToImage.get(productCode);
            if (img) {
              const imageMarkdown = `\n\n![${img.alt || linkText}](${img.url})\n\n`;
              imagesToInsert.push(imageMarkdown);
            }
          } else {
            // remove 3rd+ appearances
            modifiedPara = modifiedPara.replace(fullMatch, '');
          }
        } catch (err) {
          console.error('Error processing URL in paragraph:', err);
        }
      });

      modifiedParagraphs.push(modifiedPara + imagesToInsert.join(''));
    });

    const modifiedContent = modifiedParagraphs.join('\n\n');
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
