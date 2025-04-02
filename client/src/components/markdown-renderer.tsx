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
    return content.split('\n').map(line => {
      // Check for affiliate URL markdown pattern [text](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;

        // Only process Viator affiliate URLs
        if (url.includes('viator.com')) {
          try {
            console.log('[MarkdownRenderer] Processing URL:', url);
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            console.log('[MarkdownRenderer] URL segments:', pathSegments);
            
            const lastSegment = pathSegments[pathSegments.length - 1];
            console.log('[MarkdownRenderer] Last segment:', lastSegment);
            
            const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
            console.log('[MarkdownRenderer] Code match result:', codeMatch);
            
            const productCode = codeMatch ? codeMatch[1] : null;
            console.log('[MarkdownRenderer] Extracted product code:', productCode);

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
                console.log('[MarkdownRenderer] Found matching image:', {
                  productCode,
                  imageUrl: matchingImage.url,
                  alt: matchingImage.alt
                });

                const count = productCodeOccurrences.get(productCode) || 0;
                console.log('[MarkdownRenderer] Current occurrence count:', {
                  productCode,
                  previousCount: count,
                  newCount: count + 1
                });

                productCodeOccurrences.set(productCode, count + 1);

                if (count >= 1) {
                  console.log('[MarkdownRenderer] Inserting image:', {
                    productCode,
                    occurrence: count + 1,
                    line: line,
                    imageMarkdown: `![${matchingImage.alt || linkText}](${matchingImage.url})`
                  });
                  return `${line}\n\n![${matchingImage.alt || linkText}](${matchingImage.url})`;
                } else {
                  console.log('[MarkdownRenderer] Skipping image insertion:', {
                    productCode,
                    occurrence: count + 1,
                    reason: 'Not second occurrence yet'
                  });
                }
              } else {
                console.log('[MarkdownRenderer] No matching image found for product code:', productCode);
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