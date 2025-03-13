
import { marked } from 'marked';
import { useEffect, useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [html, setHtml] = useState('');
  
  useEffect(() => {
    if (content) {
      // Convert markdown to HTML
      const rendered = marked.parse(content);
      setHtml(rendered);
    } else {
      setHtml('');
    }
  }, [content]);

  return (
    <div 
      className={`prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}
