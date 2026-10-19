"use client";

import { useEffect, useState } from "react";
import type { GlobalSeoSettings } from "@/lib/cms-types";
import { adminRequest } from "./admin-content";
import { useUnsavedChanges } from "./useUnsavedChanges";

export default function GlobalSeoEditor() {
  const [value, setValue] = useState<GlobalSeoSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useUnsavedChanges(dirty);
  useEffect(() => {
    let active = true;
    adminRequest<GlobalSeoSettings>("settings/seo")
      .then((data) => {
        if (active) setValue(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save() {
    if (!value) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setValue(
        await adminRequest<GlobalSeoSettings>("settings/seo", "PUT", value),
      );
      setDirty(false);
      setMessage(
        "Global SEO saved to the database. The suffix applies immediately to all public page titles.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-data-panel">
      <div className="admin-panel-heading">
        <h2>Global SEO</h2>
      </div>
      <div className="admin-settings-body">
        <p>
          Text after the vertical bar in every public page title. Saving updates
          the global suffix immediately; individual page SEO titles keep their
          existing draft and publish workflow.
        </p>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="admin-notice" role="status">
            {message}
          </p>
        )}
        {!value && !error && <p>Loading settings…</p>}
        {value && (
          <fieldset disabled={busy} className="admin-fields">
            {(["en", "es"] as const).map((locale) => (
              <label key={locale}>
                {locale === "en" ? "English SEO suffix" : "Spanish SEO suffix"}
                <input
                  maxLength={200}
                  required
                  value={value.title_suffix[locale]}
                  onChange={(e) => {
                    setValue({
                      ...value,
                      title_suffix: {
                        ...value.title_suffix,
                        [locale]: e.target.value,
                      },
                    });
                    setDirty(true);
                    setMessage("");
                  }}
                />
                <small>Page title | {value.title_suffix[locale]}</small>
              </label>
            ))}
            <button
              type="button"
              className="admin-primary"
              disabled={
                busy ||
                !dirty ||
                !value.title_suffix.en.trim() ||
                !value.title_suffix.es.trim()
              }
              onClick={save}
            >
              {busy ? "Saving…" : "Save global SEO"}
            </button>
          </fieldset>
        )}
      </div>
    </section>
  );
}
