import React from "react";

interface MarkdownViewProps {
  markdown: string;
}

// Minimal, safe markdown renderer without using innerHTML
// Supports: headings (#..######), paragraphs, code blocks ``` ``` , inline `code`,
// unordered/ordered lists, bold **text**, italic *text*, and links [text](url)
// Preserves single newlines inside paragraphs as <br/>
const MarkdownView: React.FC<MarkdownViewProps> = ({ markdown }) => {
  const lines = (markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  let blockKey = 0;

  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;

    // Process links, code spans, bold, italics in a simple loop
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\)]+\))/g;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = pattern.exec(remaining)) !== null) {
      const before = remaining.slice(idx, match.index);
      if (before) nodes.push(before);
      const token = match[0];
      if (token.startsWith("`")) {
        nodes.push(<code key={`c-${blockKey}-${idx}`}>{token.slice(1, -1)}</code>);
      } else if (token.startsWith("**")) {
        nodes.push(<strong key={`b-${blockKey}-${idx}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*")) {
        nodes.push(<em key={`i-${blockKey}-${idx}`}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith("[")) {
        const m = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
        if (m) {
          const [_, label, href] = m;
          nodes.push(
            <a key={`a-${blockKey}-${idx}`} href={href} target="_blank" rel="noreferrer noopener">
              {label}
            </a>
          );
        } else {
          nodes.push(token);
        }
      }
      idx = (match.index || 0) + token.length;
    }
    const tail = remaining.slice(idx);
    if (tail) nodes.push(tail);
    return nodes;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      elements.push(
        <pre key={`pre-${blockKey++}`} className="rounded bg-editor-background border border-editor-border p-3 overflow-auto">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i += 1;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = h[2];
      const Tag = ("h" + level) as keyof JSX.IntrinsicElements;
      elements.push(
        <Tag key={`h-${blockKey++}`} className="mt-4 first:mt-0">{renderInline(content)}</Tag>
      );
      i += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, "");
        items.push(<li key={`li-${i}`}>{renderInline(itemText)}</li>);
        i += 1;
      }
      elements.push(<ul key={`ul-${blockKey++}`} className="list-disc pl-6">{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
        items.push(<li key={`oli-${i}`}>{renderInline(itemText)}</li>);
        i += 1;
      }
      elements.push(<ol key={`ol-${blockKey++}`} className="list-decimal pl-6">{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      elements.push(<hr key={`hr-${blockKey++}`} className="my-4 border-editor-border" />);
      i += 1;
      continue;
    }

    // Paragraphs (collect until blank line) – preserve single newlines as <br/>
    if (line.trim().length > 0) {
      const para: string[] = [line];
      i += 1;
      while (i < lines.length && lines[i].trim().length > 0) {
        para.push(lines[i]);
        i += 1;
      }
      const paragraphText = para.join("\n");
      const parts = paragraphText.split("\n");
      const children: React.ReactNode[] = [];
      parts.forEach((part, idx) => {
        children.push(<React.Fragment key={`pf-${blockKey}-${idx}`}>{renderInline(part)}</React.Fragment>);
        if (idx < parts.length - 1) children.push(<br key={`br-${blockKey}-${idx}`} />);
      });
      elements.push(
        <p key={`p-${blockKey++}`}>{children}</p>
      );
      continue;
    }

    // Blank line
    i += 1;
  }

  return <div>{elements}</div>;
};

export default MarkdownView;


