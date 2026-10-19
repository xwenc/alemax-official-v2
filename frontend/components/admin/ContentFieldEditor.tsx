"use client";
import type { CmsFields } from "@/lib/cms-types";
import RichTextEditor from "./RichTextEditor";
import { blocksToDocument, documentToBlocks } from "@/lib/rich-text";
export default function ContentFieldEditor({
  fields,
  onChange,
  disabled,
}: {
  fields: CmsFields;
  onChange: (value: CmsFields) => void;
  disabled: boolean;
}) {
  const set = (key: keyof CmsFields, value: string) =>
    onChange({ ...fields, [key]: value });
  return (
    <fieldset disabled={disabled} className="admin-fields">
      <label>
        Title
        <input
          maxLength={300}
          value={fields.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </label>
      <label>
        Summary
        <textarea
          rows={3}
          maxLength={5000}
          value={fields.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </label>
      <div className="admin-block-heading">
        <h3>Body content</h3>
      </div>
      <RichTextEditor
        value={fields.body || blocksToDocument(fields.blocks)}
        disabled={disabled}
        onChange={(body) =>
          onChange({ ...fields, body, blocks: documentToBlocks(body) })
        }
      />
      <details className="admin-seo">
        <summary>SEO & accessibility</summary>
        <label>
          SEO title
          <input
            maxLength={300}
            value={fields.seo_title}
            onChange={(e) => set("seo_title", e.target.value)}
          />
        </label>
        <label>
          SEO description
          <textarea
            rows={3}
            maxLength={1000}
            value={fields.seo_description}
            onChange={(e) => set("seo_description", e.target.value)}
          />
        </label>
        <label>
          Image description
          <input
            maxLength={500}
            value={fields.image_alt}
            onChange={(e) => set("image_alt", e.target.value)}
          />
        </label>
      </details>
    </fieldset>
  );
}
