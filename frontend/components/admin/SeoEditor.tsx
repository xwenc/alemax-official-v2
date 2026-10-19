"use client";

import type { CmsFields } from "@/lib/cms-types";

export default function SeoEditor({
  fields,
  onChange,
}: {
  fields: CmsFields;
  onChange: (value: CmsFields) => void;
}) {
  const title = fields.seo_title || fields.title || "Page title";
  const description = fields.seo_description || fields.summary;
  return (
    <section className="admin-seo" aria-label="Search engine optimization">
      <h3>SEO copy</h3>
      <p>
        Saved to the database with this language draft. Publish this edition to
        update the live page.
      </p>
      <label>
        SEO title
        <input
          maxLength={300}
          value={fields.seo_title}
          onChange={(e) => onChange({ ...fields, seo_title: e.target.value })}
          placeholder={fields.title}
        />
        <small>
          {fields.seo_title.length} characters · Aim for about 50–60; display
          length varies.
        </small>
      </label>
      <label>
        SEO description
        <textarea
          rows={3}
          maxLength={1000}
          value={fields.seo_description}
          onChange={(e) =>
            onChange({ ...fields, seo_description: e.target.value })
          }
          placeholder={fields.summary}
        />
        <small>
          {fields.seo_description.length} characters · Aim for about 150–160;
          display length varies.
        </small>
      </label>
      <div className="admin-seo-preview">
        <small>
          Search preview · Search engines may choose different text.
        </small>
        <h4>{title} | ALEMAX</h4>
        <p>
          {description || "Add a description to preview your search snippet."}
        </p>
      </div>
    </section>
  );
}
