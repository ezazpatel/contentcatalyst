import { marked } from "marked";
import { useEffect, useRef } from "react";
import { ProductSlideshow } from "./product-slideshow";
import ReactDOM from 'react-dom';

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
      const root = document.createElement('div');
      wrapper.appendChild(root);

      // Replace the original div with our wrapper
      div.parentNode?.replaceChild(wrapper, div);

      // Render the ProductSlideshow component into the root
      const props: SlideshowData = { images, productName };
      const Component = ProductSlideshow;
      // @ts-ignore - Need to handle React component rendering
      ReactDOM.render(<Component {...props} />, root);
    });
  }, [content]);

  // Parse markdown with marked and convert it to HTML
  const htmlContent = marked(content);

  return (
    <div
      ref={containerRef}
      className="blog-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}