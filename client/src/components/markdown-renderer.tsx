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
      gfm: true,
      breaks: true
    });

    // Convert markdown to HTML
    const html = marked(content);

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all slideshow divs
    const slideshowDivs = tempDiv.querySelectorAll('.product-slideshow');
    const newSlideshows: SlideshowData[] = [];

    slideshowDivs.forEach((div, index) => {
      const images = Array.from(div.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt,
        affiliateUrl: img.dataset.affiliateUrl
      }));

      if (images.length > 0) {
        const productName = images[0].alt.split(' - ')[0] || 'Product';
        newSlideshows.push({ images, productName });

        // Replace the original div with a placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'product-slideshow-placeholder';
        placeholder.dataset.index = index.toString();
        div.replaceWith(placeholder);
      }
    });

    setHtmlContent(tempDiv.innerHTML);
    setSlideshows(newSlideshows);
  }, [content]);

  return (
    <div className="prose max-w-none overflow-x-hidden">
      {htmlContent.split('<div class="product-slideshow-placeholder"').map((part, index) => {
        if (index === 0) return <div key="start" dangerouslySetInnerHTML={{ __html: part }} />;

        const [dataIndex, ...rest] = part.split('>');
        const slideshowIndex = parseInt(dataIndex.match(/data-index="(\d+)"/)?.[1] || "0");

        return (
          <React.Fragment key={index}>
            {slideshows[slideshowIndex] && (
              <div className="my-8">
                <ProductSlideshow
                  images={slideshows[slideshowIndex].images}
                  productName={slideshows[slideshowIndex].productName}
                />
              </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: rest.join('>') }} />
          </React.Fragment>
        );
      })}
    </div>
  );
}