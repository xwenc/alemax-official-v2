"use client";
import Link from "next/link";
import type { CmsKind } from "@/lib/cms-types";
import useContentEditor from "./useContentEditor";
import EnglishContentForm from "./EnglishContentForm";
import SpanishEdition from "./SpanishEdition";
import PublishPanel from "./PublishPanel";
import { kindName, sectionUrl } from "./admin-content";
export default function ContentEditor({
  id,
  initialKind,
}: {
  id: string;
  initialKind?: CmsKind;
}) {
  const editor = useContentEditor(id, initialKind);
  const {
    current,
    creating,
    loaded,
    kind,
    dirty,
    busy,
    tab,
    setTab,
    setError,
    error,
    message,
  } = editor;
  if (!loaded && !creating)
    return (
      <p className="admin-loading" role="status">
        Loading content…
      </p>
    );
  if (loaded && !current && !creating)
    return (
      <section className="admin-empty">
        <h1>{error ? "Unable to load content" : "Content not found"}</h1>
        <p>{error || "This item is no longer available."}</p>
        <Link className="admin-button" href="/admin/overview">
          Back to overview
        </Link>
      </section>
    );
  return (
    <>
      <Link className="admin-back" href={sectionUrl(kind)}>
        ← Back to {kindName(kind).toLowerCase()}
      </Link>
      <div className="admin-intro">
        <div>
          <h1>
            {creating ? "New content" : current?.translations.en?.fields.title}
          </h1>
          <p>
            {creating
              ? "Create your English source, then prepare the Spanish edition."
              : `${kindName(kind)} · English source version ${current?.version}`}
          </p>
        </div>
        <span className="admin-badge">
          {dirty ? "Unsaved changes" : creating ? "New draft" : "Saved draft"}
        </span>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="admin-success" role="status">
          {message}
        </p>
      )}
      {current?.job && (
        <p
          className={
            current.job.status === "failed" ? "admin-error" : "admin-notice"
          }
        >
          Translation: {current.job.status}
          {current.job.error && ` — ${current.job.error}`}
        </p>
      )}
      <section className="admin-editor">
        <div
          className="admin-tabs"
          role="tablist"
          aria-label="Content editions"
        >
          {(["en", "es", "preview"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              disabled={busy || (creating && value !== "en")}
              onClick={() => {
                if (dirty) {
                  setError(
                    "Save or discard your changes before switching editions.",
                  );
                  return;
                }
                setError("");
                setTab(value);
              }}
            >
              {value === "en"
                ? "English source"
                : value === "es"
                  ? "Spanish edition"
                  : "Preview & publish"}
            </button>
          ))}
        </div>
        {tab === "en" && <EnglishContentForm editor={editor} />}
        {tab === "es" && <SpanishEdition editor={editor} />}
        {tab === "preview" && <PublishPanel editor={editor} />}
      </section>
    </>
  );
}
