import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import { ProductSlideshow } from "./product-slideshow";

interface ProductImage {
  url: string;
  alt: string;
  affiliateUrl: string;
}

interface SlideShowData {
  images: ProductImage[];
  productName: string;
}

interface SlideshowData {
  images: ProductImage[];
  productName: string;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const [slideshows, setSlideshows] = useState<SlideshowData[]>([]);
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    // Configure marked renderer
    const renderer = new marked.Renderer();

    renderer.html = (html: string) => {
      if (html.includes('product-slideshow')) {
        return html;
      }
      return html;
    };

    marked.setOptions({
      renderer,
      headerIds: false,
      mangle: false,
      gfm: true,
      breaks: true
    });

    // Convert markdown to HTML
    const parsedHtml = marked.parse(content);

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedHtml;

    // Find all slideshows
    const slideshowDivs = tempDiv.querySelectorAll('.product-slideshow');
    const newSlideshows: SlideshowData[] = [];

    slideshowDivs.forEach(div => {
      const images = Array.from(div.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt
      }));

      if (images.length > 0) {
        const productName = images[0].alt.split(' - ')[0] || 'Product';
        newSlideshows.push({ images, productName });
        // Replace slideshow div with placeholder
        div.innerHTML = '<!-- slideshow-placeholder -->';
      }
    });

    // Find product slideshow divs and extract their data
    const slideshowDivs = tempDiv.getElementsByClassName('product-slideshow');
    const newSlideshows: SlideShowData[] = [];

    Array.from(slideshowDivs).forEach((div) => {
      const images = Array.from(div.getElementsByTagName('img')).map((img) => ({
        url: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
        affiliateUrl: img.getAttribute('data-affiliate-url') || img.getAttribute('src') || '',
      }));
      
      if (images.length > 0) {
        newSlideshows.push({
          images,
          productName: images[0].alt,
        });
        // Replace the slideshow div with a placeholder
        div.outerHTML = '<!-- slideshow-placeholder -->';
      }
    });

    setHtmlContent(tempDiv.innerHTML);
    setSlideshows(newSlideshows);
  }, [content]);

  const contentParts = htmlContent.split('<!-- slideshow-placeholder -->');

  return (
    <div className="prose max-w-none">
      {contentParts.map((part, index) => (
        <div key={index}>
          <div dangerouslySetInnerHTML={{ __html: part }} />
          {index < slideshows.length && slideshows[index].images.length > 0 && (
            <div className="my-8">
              <ProductSlideshow
                images={slideshows[index].images}
                productName={slideshows[index].productName}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}