import RichText from "@/components/content/RichText";
import { blocksToDocument } from "@/lib/rich-text";
import type { ReactNode } from "react";
import type { ContentPage } from "./content";
export default function ContentBody({
  page,
  children,
  production = false,
}: {
  page: ContentPage;
  children?: ReactNode;
  production?: boolean;
}) {
  return (
    <>
      {page.images.length > 0 && (
        <div className="origin-gallery">
          {page.images.slice(0, 3).map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt={page.fields?.image_alt || `${page.title} ${i + 1}`}
              loading="lazy"
            />
          ))}
        </div>
      )}
      <article className="legacy-prose">
        {children}
        {page.fields?.summary && <p>{page.fields.summary}</p>}
        <RichText
          document={
            page.fields?.body ||
            blocksToDocument(
              page.blocks.filter(
                (b) =>
                  !production || !!page.fields || ["p", "h2"].includes(b.tag),
              ),
            )
          }
        />
      </article>
    </>
  );
}
