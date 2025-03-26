
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AffiliateImage } from "@shared/schema";
import ProductSlideshow from "@/components/product-slideshow";

interface Props {
  content: string;
  images: AffiliateImage[];
}

export function MarkdownRenderer({ content, images }: Props) {
  const [productCodeCounts, setProductCodeCounts] = React.useState(new Map<string, number>());
  const [renderedContent, setRenderedContent] = React.useState<JSX.Element[]>([]);

  React.useEffect(() => {
    const newProductCodeCounts = new Map<string, number>();
    const elements: JSX.Element[] = [];

    // First render the markdown content
    elements.push(
      <ReactMarkdown
        key="markdown"
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    );

    // Then process the content for product codes
    const lines = content.split('\n');
    for (const line of lines) {
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;
        const urlParts = new URL(url).pathname.split('/');
        const code = urlParts[urlParts.length - 1];

        const count = (newProductCodeCounts.get(code) || 0) + 1;
        newProductCodeCounts.set(code, count);

        // Add slideshow after second occurrence of product code
        if (count === 2) {
          const productImages = images.filter(img => 
            img.affiliateUrl.includes(code)
          );
          if (productImages.length > 0) {
            elements.push(
              <div key={`slideshow-${code}`} className="my-4">
                <ProductSlideshow images={productImages} />
              </div>
            );
          }
        }
      }
    }

    setProductCodeCounts(newProductCodeCounts);
    setRenderedContent(elements);
  }, [content, images]);

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      {renderedContent}
    </div>
  );
}
