"use client";
import type { ContentEditorState } from "./useContentEditor";
import ContentFieldEditor from "./ContentFieldEditor";
import { kinds, kindName } from "./admin-content";
import type { CmsKind } from "@/lib/cms-types";
export default function EnglishContentForm({
  editor,
}: {
  editor: ContentEditorState;
}) {
  const {
    current,
    creating,
    busy,
    kind,
    slug,
    setKind,
    setSlug,
    setDirty,
    en,
    setEn,
    shared,
    setShared,
    items,
    upload,
    act,
  } = editor;
  return (
    <fieldset disabled={busy}>
      {kind === "page" && (
        <p className="admin-hint">
          Page slugs: home, products, production-bases, about, activity,
          contact, privacy, cookie, terms. For home and listing pages, SEO copy
          controls search metadata.
        </p>
      )}
      <div className="admin-form-row">
        <label>
          Content type
          <select
            disabled={!creating || busy}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as CmsKind);
              setDirty(true);
            }}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {kindName(k)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Permanent URL slug
          <input
            disabled={!creating || busy}
            value={slug}
            pattern="[a-zA-Z0-9][a-zA-Z0-9-]*"
            placeholder="calcium-stearate"
            onChange={(e) => {
              setSlug(e.target.value);
              setDirty(true);
            }}
          />
        </label>
      </div>
      {kind === "page" && (
        <p className="admin-hint">
          Page slugs: about, activity, contact, privacy, cookie, terms.
        </p>
      )}
      <ContentFieldEditor
        onImageBusyChange={(busy) => {
          editor.setBusy(busy);
          if (busy) editor.setDirty(true);
        }}
        key={current?.id || "new"}
        fields={en}
        onChange={(value) => {
          setEn(value);
          setDirty(true);
        }}
        disabled={busy}
      />
      {kind === "product" && (
        <div className="admin-form-row">
          <label>
            Product code
            <input
              value={shared.code || ""}
              onChange={(e) => {
                setShared({ ...shared, code: e.target.value });
                setDirty(true);
              }}
            />
          </label>
          <label>
            Category
            <select
              value={shared.category_slug || ""}
              onChange={(e) => {
                setShared({
                  ...shared,
                  category_slug: e.target.value,
                });
                setDirty(true);
              }}
            >
              <option value="">No category</option>
              {items
                .filter((i) => i.kind === "category")
                .map((i) => (
                  <option key={i.id} value={i.slug}>
                    {i.translations.en?.fields.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Production base
            <select
              value={shared.origin_slug || ""}
              onChange={(e) => {
                setShared({
                  ...shared,
                  origin_slug: e.target.value,
                });
                setDirty(true);
              }}
            >
              <option value="">No production base</option>
              {items
                .filter((i) => i.kind === "production-base")
                .map((i) => (
                  <option key={i.id} value={i.slug}>
                    {i.translations.en?.fields.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      {kind === "product" && (
        <div className="admin-feature-setting">
          <label>
            <input
              type="checkbox"
              checked={shared.feature === true}
              onChange={(e) => {
                setShared({ ...shared, feature: e.target.checked });
                setDirty(true);
              }}
            />
            Feature on homepage
          </label>
          <p className="admin-hint">
            Show this product in Featured products. Save the draft and publish
            each language edition to update the website.
          </p>
        </div>
      )}
      <div className="admin-form-row">
        <label>
          Display order
          <input
            type="number"
            value={shared.sort_order || 0}
            onChange={(e) => {
              setShared({
                ...shared,
                sort_order: Number(e.target.value),
              });
              setDirty(true);
            }}
          />
        </label>
        <label>
          Upload image (PNG, JPEG, WebP · max 10 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <label>
        Image URLs (one per line)
        <textarea
          rows={3}
          value={(shared.images || []).join("\n")}
          onChange={(e) => {
            setShared({
              ...shared,
              images: e.target.value.split("\n").filter(Boolean),
            });
            setDirty(true);
          }}
        />
      </label>
      <button
        className="admin-primary"
        disabled={busy || !en.title.trim() || !slug}
        onClick={() => act("save")}
      >
        {busy ? "Saving…" : "Save English draft"}
      </button>
    </fieldset>
  );
}
