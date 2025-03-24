import { marked } from "marked";
import { useEffect, useRef } from "react";
import { createRoot } from 'react-dom/client';
import { ProductSlideshow } from "./product-slideshow";

interface SlideshowData {
  images: {
    url: string;
    alt: string;
  }[];
  productName: string;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all product slideshow divs
    const slideshowDivs = containerRef.current.querySelectorAll('.product-slideshow');
    slideshowDivs.forEach(div => {
      // Get all images in this slideshow
      const images = Array.from(div.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt
      }));

      if (images.length === 0) return;

      // Get product name from first image alt text
      const productName = images[0].alt.split(' - ')[0] || 'Product';

      // Create a new wrapper for the slideshow
      const wrapper = document.createElement('div');

      // Replace the original div with our wrapper
      div.parentNode?.replaceChild(wrapper, div);

      // Create a React root and render the ProductSlideshow
      const root = createRoot(wrapper);
      root.render(
        <ProductSlideshow
          images={images}
          productName={productName}
        />
      );
    });

    // Cleanup function to unmount React components
    return () => {
      if (containerRef.current) {
        const wrappers = containerRef.current.querySelectorAll('.product-slideshow-wrapper');
        wrappers.forEach(wrapper => {
          const root = (wrapper as any)._reactRoot;
          if (root) {
            root.unmount();
          }
        });
      }
    };
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="blog-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: marked(content) }}
    />
  );
}