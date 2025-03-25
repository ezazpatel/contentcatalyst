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
    // Configure marked renderer to preserve our slideshow HTML
    const renderer = new marked.Renderer();

    // Override the HTML rendering to preserve our slideshow divs
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

    // Find all slideshow sections
    const slideshowSections = tempDiv.innerHTML.split('<!-- slideshow-start -->');
    const newSlideshows: SlideshowData[] = [];

    // Process each section after the first one (which is before any slideshow)
    slideshowSections.slice(1).forEach(section => {
      const [slideshowHtml, ...rest] = section.split('<!-- slideshow-end -->');

      // Extract images from the slideshow HTML
      const tempSlideshow = document.createElement('div');
      tempSlideshow.innerHTML = slideshowHtml;

      const images = Array.from(tempSlideshow.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt,
        affiliateUrl: img.dataset.affiliateUrl
      }));

      if (images.length > 0) {
        const productName = images[0].alt.split(' - ')[0] || 'Product';
        newSlideshows.push({ images, productName });

        // Replace slideshow HTML with placeholder
        tempDiv.innerHTML = tempDiv.innerHTML.replace(
          slideshowHtml,
          '<!-- slideshow-placeholder -->'
        );
      }
    });

    setHtmlContent(tempDiv.innerHTML);
    setSlideshows(newSlideshows);
  }, [content]);

  // Split content by slideshow placeholders
  const contentParts = htmlContent.split('<!-- slideshow-placeholder -->');

  return (
    <div className="prose max-w-none overflow-x-hidden">
      {contentParts.map((part, index) => (
        <div key={index}>
          <div dangerouslySetInnerHTML={{ __html: part }} />
          {index < slideshows.length && (
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