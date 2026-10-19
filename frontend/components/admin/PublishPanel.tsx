"use client";
import type { ContentEditorState } from "./useContentEditor";
import ContentPreview from "./ContentPreview";
import { publicContentUrl as url } from "./admin-content";
export default function PublishPanel({
  editor,
}: {
  editor: ContentEditorState;
}) {
  const { current, busy, dirty, translation, kind, slug, shared, act } = editor;
  if (!current) return null;
  return (
    <>
      <p className="admin-hint">
        These are saved drafts. Publishing replaces only the selected live
        edition; source edits and translation jobs do not change live pages.
      </p>
      <div className="admin-previews">
        {(["en", "es"] as const).map((locale) => (
          <section key={locale}>
            <div className="admin-publish-head">
              <h3>{locale === "en" ? "English" : "Spanish"}</h3>
              <span className="admin-badge">
                {current.published[locale]
                  ? `Live v${current.published[locale]!.source_version}`
                  : "Not published"}
              </span>
            </div>
            {current.translations[locale] ? (
              <ContentPreview
                fields={current.translations[locale]!.fields}
                shared={shared}
              />
            ) : (
              <p>No Spanish translation yet.</p>
            )}
            <div className="admin-toolbar">
              <button
                className="admin-primary"
                disabled={
                  busy ||
                  dirty ||
                  !current.translations[locale] ||
                  (locale === "es" &&
                    (translation?.status !== "approved" ||
                      translation.source_version !== current.version))
                }
                onClick={() => act("publish", locale)}
              >
                Publish {locale.toUpperCase()}
              </button>
              {current.published[locale] && (
                <>
                  <a
                    href={url(kind, slug, locale)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View live ↗
                  </a>
                  <button
                    disabled={busy || dirty}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Unpublish the ${locale.toUpperCase()} edition?`,
                        )
                      )
                        act("unpublish", locale);
                    }}
                  >
                    Unpublish
                  </button>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
