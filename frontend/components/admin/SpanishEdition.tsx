"use client";
import type { ContentEditorState } from "./useContentEditor";
import ContentFieldEditor from "./ContentFieldEditor";
import ContentPreview from "./ContentPreview";
export default function SpanishEdition({
  editor,
}: {
  editor: ContentEditorState;
}) {
  const {
    current,
    busy,
    dirty,
    translation,
    en,
    es,
    setEs,
    shared,
    setDirty,
    configured,
    act,
  } = editor;
  return (
    <>
      <p className="admin-notice">
        Status: {translation?.status || "missing"}. English source version{" "}
        {current?.version}; Spanish source version{" "}
        {translation?.source_version || "—"}. Saving Spanish confirms that you
        have reconciled it with the current English source.
      </p>
      <details>
        <summary>View current English source</summary>
        <ContentPreview fields={en} shared={shared} />
      </details>
      <ContentFieldEditor
        locale="es"
        onImageBusyChange={(busy) => {
          editor.setBusy(busy);
          if (busy) editor.setDirty(true);
        }}
        key={current?.id || "new"}
        fields={es}
        onChange={(value) => {
          setEs(value);
          setDirty(true);
        }}
        disabled={busy}
      />
      <div className="admin-toolbar">
        <button
          className="admin-primary"
          disabled={busy || !es.title.trim()}
          onClick={() => act("save")}
        >
          Save Spanish draft
        </button>
        <button
          disabled={busy || dirty || !configured}
          onClick={() => {
            if (
              translation &&
              !window.confirm(
                "Generate a new Spanish draft? Existing Spanish draft edits will be replaced when translation finishes. Live content is preserved.",
              )
            )
              return;
            act("translate");
          }}
        >
          Generate / retry translation
        </button>
        <button
          disabled={busy || dirty || translation?.status !== "review"}
          onClick={() => act("review")}
        >
          Approve Spanish
        </button>
      </div>
    </>
  );
}
