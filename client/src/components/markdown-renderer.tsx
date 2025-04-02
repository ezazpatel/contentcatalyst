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
    // Create maps to track product codes and their images
    const productCodeToImage = new Map();
    const productCodeOccurrences = new Map();

    // Map product codes to their images
    affiliateImages.forEach(img => {
      if (img.productCode) {
        productCodeToImage.set(img.productCode, img);
      }
    });

    // Process content line by line
    return content.split('\n').map(line => {
      // Check for affiliate URL markdown pattern [text](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;

        // Only process Viator affiliate URLs
        if (url.includes('viator.com')) {
          try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1];
            const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
            const productCode = codeMatch ? codeMatch[1] : null;

            console.log('[Product Code Debug]', {
              url,
              lastSegment,
              extractedCode: productCode,
              matchResult: codeMatch
            });

            if (productCode) {
              console.log(`[MarkdownRenderer Debug] Processing productCode:`, {
                productCode,
                matchingImages: affiliateImages.filter(img => img.productCode === productCode).length,
                totalImages: affiliateImages.length
              });

              // Find matching image by product code from our stored affiliateImages
              const matchingImage = affiliateImages.find(img => 
                img.productCode === productCode
              );

              if (matchingImage) {
                const count = productCodeOccurrences.get(productCode) || 0;
                productCodeOccurrences.set(productCode, count + 1);

                console.log(`[MarkdownRenderer] Found productCode: ${productCode}, occurrence: ${count + 1}`);

                // Add image after second occurrence of affiliate link
                if (count >= 1) {
                  console.log(`[MarkdownRenderer] Inserting image for productCode: ${productCode}`);
                  return `${line}\n\n![${matchingImage.alt || linkText}](${matchingImage.url})`;
                }
              }
            }
          } catch (error) {
            console.error('Error processing affiliate URL:', error);
          } finally {
            // Always continue processing the next line even if there's an error
          }
        }
      }
      return line;
    }).join('\n');
  }, [content, affiliateImages]);

  return (
    <ReactMarkdown
      className="prose prose-lg max-w-none prose-img:max-w-full prose-img:mx-auto"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
    >
      {processedContent}
    </ReactMarkdown>
  );
}