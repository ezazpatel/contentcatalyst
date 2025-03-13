import { marked } from "marked";

export function MarkdownRenderer({ content }: { content: string }) {
  // Parse markdown with marked and convert it to HTML
  const htmlContent = marked(content);

  return (
    <div
      className="blog-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}