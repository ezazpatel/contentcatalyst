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

    // Configure marked to preserve our custom HTML
    marked.setOptions({
      headerIds: false,
      mangle: false,
      headerPrefix: '',
      xhtml: true,
      gfm: true,
      breaks: true,
      renderer: {
        html(html: string) {
          // Preserve our product slideshow divs
          if (html.includes('product-slideshow')) {
            console.log('Found product slideshow HTML:', html);
            return html;
          }
          // Filter out view all photos links
          if (html.includes('View all photos') || html.includes('*View all photos*')) {
            return '';
          }
          return html;
        }
      }
    });

    // Find all product slideshow divs
    const slideshowDivs = containerRef.current.querySelectorAll('.product-slideshow');
    console.log('Found slideshow divs:', slideshowDivs.length);

    slideshowDivs.forEach(div => {
      // Get all images in this slideshow
      const images = Array.from(div.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt
      }));

      if (images.length === 0) {
        console.log('No images found in slideshow div');
        return;
      }

      console.log('Processing images:', images);

      // Get product name from first image alt text
      const productName = images[0].alt.split(' - ')[0] || 'Product';

      // Create a new wrapper for the slideshow
      const wrapper = document.createElement('div');
      wrapper.className = 'product-slideshow-wrapper';

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

      // Store the root for cleanup
      (wrapper as any)._reactRoot = root;
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

  // First convert the markdown to HTML, then let the effect handle the slideshows
  const htmlContent = marked(content, {
    breaks: true,
    mangle: false,
    headerIds: false,
    headerPrefix: '',
    gfm: true,
    renderer: new marked.Renderer()
  });
  console.log('Generated HTML content:', htmlContent);

  return (
    <div
      ref={containerRef}
      className="blog-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}