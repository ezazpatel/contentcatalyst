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
    if (!content || !affiliateImages?.length) return content;

    // Create image lookup map
    const imagesByCode = new Map(
      affiliateImages.filter(isValidAffiliateImage).map(img => [img.productCode, img])
    );

    let modifiedContent = content;
    const viatorLinks = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+viator\.com[^\)]*)\)/g)];
    const occurrences = new Map<string, number>();

    viatorLinks.forEach(([fullMatch, linkText, url]) => {
      try {
        const urlObj = new URL(url);
        const productCode = urlObj.pathname.split('/').pop()?.split('?')[0];
        if (!productCode) return;

        const count = occurrences.get(productCode) || 0;
        occurrences.set(productCode, count + 1);

        if (count === 1) { // insert after 2nd appearance
          const matchingImage = imagesByCode.get(productCode);
          if (matchingImage) {
            const imageMarkdown = `\n\n![${matchingImage.alt || linkText}](${matchingImage.url})\n\n`;
            modifiedContent = modifiedContent.replace(fullMatch, `${fullMatch}${imageMarkdown}`);
          }
        }
      } catch (err) {
        console.error('Error processing link:', err);
      }
    });

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