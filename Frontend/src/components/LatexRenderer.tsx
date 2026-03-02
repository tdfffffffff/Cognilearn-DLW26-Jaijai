/**
 * LaTeX Renderer — renders LaTeX math inline within text.
 *
 * Parses text for:
 * - Display math: $$...$$
 * - Inline math: $...$
 *
 * Renders math with KaTeX and leaves plain text as-is.
 */
import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  text: string;
  className?: string;
}

/**
 * Parse text containing $...$ and $$...$$ LaTeX and render it.
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, className }) => {
  if (!text) return null;

  const parts = parseLatex(text);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }
        try {
          const html = katex.renderToString(part.content, {
            throwOnError: false,
            displayMode: part.type === "display",
          });
          return (
            <span
              key={i}
              className={part.type === "display" ? "block my-2 text-center" : ""}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <code key={i}>{part.content}</code>;
        }
      })}
    </span>
  );
};

interface ParsedPart {
  type: "text" | "inline" | "display";
  content: string;
}

function parseLatex(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for display math $$...$$
    const displayMatch = remaining.match(/\$\$([\s\S]*?)\$\$/);
    // Check for inline math $...$
    const inlineMatch = remaining.match(/\$([^\$\n]+?)\$/);

    if (!displayMatch && !inlineMatch) {
      parts.push({ type: "text", content: remaining });
      break;
    }

    // Find whichever comes first
    const displayIdx = displayMatch ? remaining.indexOf(displayMatch[0]) : Infinity;
    const inlineIdx = inlineMatch ? remaining.indexOf(inlineMatch[0]) : Infinity;

    if (displayIdx <= inlineIdx && displayMatch) {
      // Text before the match
      if (displayIdx > 0) {
        parts.push({ type: "text", content: remaining.slice(0, displayIdx) });
      }
      parts.push({ type: "display", content: displayMatch[1].trim() });
      remaining = remaining.slice(displayIdx + displayMatch[0].length);
    } else if (inlineMatch) {
      // Text before the match
      if (inlineIdx > 0) {
        parts.push({ type: "text", content: remaining.slice(0, inlineIdx) });
      }
      parts.push({ type: "inline", content: inlineMatch[1].trim() });
      remaining = remaining.slice(inlineIdx + inlineMatch[0].length);
    }
  }

  return parts;
}

export default LatexRenderer;
