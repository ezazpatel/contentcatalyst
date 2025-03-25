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

    // Configure marked with a proper renderer
    const renderer = new marked.Renderer();

    // Preserve the default HTML rendering
    renderer.html = (html: string) => {
      if (html.includes('product-slideshow')) {
        console.log('Found product slideshow HTML:', html);
        return html;
      }
      return html;
    };

    marked.setOptions({
      renderer: renderer,
      headerIds: false,
      mangle: false,
      headerPrefix: '',
      xhtml: true,
      gfm: true,
      breaks: true
    });

    // Convert markdown to HTML
    const htmlContent = marked.parse(content);
    console.log('Generated HTML content:', htmlContent);

    // Set the HTML content
    containerRef.current.innerHTML = htmlContent;

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

      // Create a new root for the slideshow
      const root = createRoot(div);
      root.render(
        <ProductSlideshow
          images={images}
          productName={productName}
        />
      );
    });
  }, [content]);

  return <div ref={containerRef} className="prose max-w-none" />;
}