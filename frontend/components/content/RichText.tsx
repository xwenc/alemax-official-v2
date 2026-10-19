import type { ReactNode } from "react";
import {
  safeRichLink,
  safeRichImage,
  type RichTextNode,
} from "@/lib/rich-text";
export default function RichText({ document }: { document: RichTextNode }) {
  function render(node: RichTextNode, key: number): ReactNode {
    const children = node.content?.map(render);
    if (node.type === "text") {
      let text: ReactNode = node.text || "";
      for (const mark of node.marks || []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        else if (mark.type === "italic") text = <em>{text}</em>;
        else if (mark.type === "underline") text = <u>{text}</u>;
        else if (mark.type === "strike") text = <s>{text}</s>;
        else if (mark.type === "link" && safeRichLink(mark.attrs?.href || ""))
          text = (
            <a href={mark.attrs!.href} rel="noopener noreferrer">
              {text}
            </a>
          );
      }
      return <span key={key}>{text}</span>;
    }
    switch (node.type) {
      case "image":
        return safeRichImage(node.attrs?.src || "") ? (
          <img
            key={key}
            src={node.attrs!.src}
            alt={node.attrs?.alt || ""}
            title={node.attrs?.title || undefined}
            loading="lazy"
          />
        ) : null;
      case "doc":
        return (
          <div key={key} className="rich-text-content">
            {children}
          </div>
        );
      case "paragraph":
        return <p key={key}>{children || <br />}</p>;
      case "heading":
        return node.attrs?.level === 3 ? (
          <h3 key={key}>{children}</h3>
        ) : (
          <h2 key={key}>{children}</h2>
        );
      case "bulletList":
        return <ul key={key}>{children}</ul>;
      case "orderedList":
        return (
          <ol key={key} start={node.attrs?.start || 1}>
            {children}
          </ol>
        );
      case "listItem":
        return <li key={key}>{children}</li>;
      case "blockquote":
        return <blockquote key={key}>{children}</blockquote>;
      case "hardBreak":
        return <br key={key} />;
      case "horizontalRule":
        return <hr key={key} />;
      default:
        return null;
    }
  }
  return render(document, 0);
}
