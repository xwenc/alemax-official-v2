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
              alt={`${page.title} ${i + 1}`}
              loading="lazy"
            />
          ))}
        </div>
      )}
      <article className="legacy-prose">
        {children}
        {page.blocks
          .filter((b) => !production || ["p", "h2"].includes(b.tag))
          .map((b, i) =>
            b.tag.startsWith("h") ? (
              <h2 key={i}>{b.text}</h2>
            ) : (
              <p className={b.tag === "li" ? "legal-list-item" : ""} key={i}>
                {b.text}
              </p>
            ),
          )}
      </article>
    </>
  );
}
