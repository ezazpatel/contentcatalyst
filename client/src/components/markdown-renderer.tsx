
import { marked } from "marked";
import { useEffect, useState } from "react";
import { ProductSlideshow } from "./product-slideshow";

interface ProductImage {
  url: string;
  alt: string;
  affiliateUrl?: string;
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
      // Special handling for slideshow divs to ensure they're preserved
      if (html.includes('product-slideshow')) {
        return `\n<div class="slideshow-wrapper">${html}</div>\n`;
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
    const slideshowDivs = tempDiv.querySelectorAll('div.product-slideshow');
    const newSlideshows: SlideshowData[] = [];

    slideshowDivs.forEach(div => {
      const images = Array.from(div.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt,
        affiliateUrl: img.getAttribute('data-affiliate-url') || undefined
      }));

      if (images.length > 0) {
        const productName = images[0].alt.split(' - ')[0] || 'Product';
        newSlideshows.push({ images, productName });
        // Replace slideshow div with placeholder
        div.innerHTML = '<!-- slideshow-placeholder -->';
      }
    });

    setHtmlContent(tempDiv.innerHTML);
    setSlideshows(newSlideshows);
  }, [content]);

  const contentParts = htmlContent.split('<!-- slideshow-placeholder -->');

  useEffect(() => {
    console.log("Content parts:", contentParts);
    console.log("Slideshows:", slideshows);
  }, [contentParts, slideshows]);

  return (
    <div className="prose max-w-none overflow-x-hidden">
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
