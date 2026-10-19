export type RichTextMark = { type: string; attrs?: { href?: string } };
export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: {
    level?: number;
    start?: number;
    src?: string;
    alt?: string | null;
    title?: string | null;
  };
  marks?: RichTextMark[];
  content?: RichTextNode[];
};
export type RichTextDocument = RichTextNode & { type: "doc" };
export type PlainBlock = { tag: "p" | "h2" | "h3" | "li"; text: string };
export function contentThumbnail(
  images: string[],
  body: RichTextNode | null | undefined,
  alt: string,
): { src: string; alt: string } | null {
  const cover = images.find(safeRichImage);
  if (cover) return { src: cover, alt };
  function find(node: RichTextNode): { src: string; alt: string } | null {
    if (node.type === "image" && safeRichImage(node.attrs?.src || ""))
      return { src: node.attrs!.src!, alt: node.attrs?.alt || alt };
    for (const child of node.content || []) {
      const image = find(child);
      if (image) return image;
    }
    return null;
  }
  return body ? find(body) : null;
}
export function safeRichImage(src: string): boolean {
  if (!src || src.length > 2000 || /[\u0000-\u0020\u007f\\]/.test(src))
    return false;
  if (
    (src.startsWith("/images/") || src.startsWith("/media/")) &&
    !src.includes("..")
  )
    return true;
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function safeRichLink(href: string): boolean {
  if (!href || /[\u0000-\u0020\u007f\\]/.test(href)) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const url = new URL(href);
    return (
      (["http:", "https:"].includes(url.protocol) && !!url.hostname) ||
      (url.protocol === "mailto:" && !!url.pathname)
    );
  } catch {
    return false;
  }
}
export function blocksToDocument(
  blocks: { tag: string; text: string }[],
): RichTextDocument {
  const content: RichTextNode[] = [];
  for (const block of blocks) {
    const inline: RichTextNode[] = block.text
      .split("\n")
      .flatMap((text, i) => [
        ...(i ? [{ type: "hardBreak" }] : []),
        ...(text ? [{ type: "text", text }] : []),
      ]);
    if (block.tag === "li") {
      if (content.at(-1)?.type !== "bulletList")
        content.push({ type: "bulletList", content: [] });
      content.at(-1)!.content!.push({
        type: "listItem",
        content: [{ type: "paragraph", content: inline }],
      });
    } else
      content.push({
        type: block.tag.startsWith("h") ? "heading" : "paragraph",
        ...(block.tag.startsWith("h")
          ? { attrs: { level: block.tag === "h3" ? 3 : 2 } }
          : {}),
        content: inline,
      });
  }
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}
export function documentToBlocks(doc: RichTextNode): PlainBlock[] {
  const blocks: PlainBlock[] = [];
  const text = (node: RichTextNode): string =>
    node.type === "hardBreak"
      ? "\n"
      : node.text || (node.content || []).map(text).join("");
  function walk(node: RichTextNode) {
    if (["paragraph", "heading"].includes(node.type))
      blocks.push({
        tag:
          node.type === "heading"
            ? node.attrs?.level === 3
              ? "h3"
              : "h2"
            : "p",
        text: text(node),
      });
    else if (node.type === "listItem") {
      const paragraphs = (node.content || []).filter(
        (c) => c.type === "paragraph",
      );
      blocks.push({ tag: "li", text: paragraphs.map(text).join("\n") });
      (node.content || []).filter((c) => c.type !== "paragraph").forEach(walk);
    } else (node.content || []).forEach(walk);
  }
  walk(doc);
  return blocks;
}
