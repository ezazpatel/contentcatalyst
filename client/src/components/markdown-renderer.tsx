import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Props {
  content: string;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function MarkdownRenderer({ content }: Props) {
  const lines = content.split('\n');
  const newLines: (string | JSX.Element)[] = [];

  for (const line of lines) {
    const lineKey = `md-${line.trim().substring(0, 20)}-${newLines.length}`;

    if (line.startsWith('## ')) {
      const heading = capitalizeWords(line.substring(3));
      newLines.push(
        <h2 key={lineKey}>{heading}</h2>
      );
    } else {
      newLines.push(
        <ReactMarkdown key={lineKey} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {line}
        </ReactMarkdown>
      );
    }
  }

  return (
    <div className="prose prose-sm w-full max-w-none dark:prose-invert lg:prose-base">
      {newLines}
    </div>
  );
}