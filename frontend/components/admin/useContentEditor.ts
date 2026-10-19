"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsFields, CmsItem, CmsKind, CmsShared } from "@/lib/cms-types";
import {
  adminRequest,
  blankFields,
  blankShared,
  type ContentLibrary,
} from "./admin-content";
import { useUnsavedChanges } from "./useUnsavedChanges";
export default function useContentEditor(
  id: string,
  initialKind: CmsKind = "product",
) {
  const router = useRouter();
  const [items, setItems] = useState<CmsItem[]>([]),
    [selected, setSelected] = useState(id === "new" ? "" : id);
  const [kind, setKind] = useState<CmsKind>(initialKind),
    [slug, setSlug] = useState("");
  const [en, setEn] = useState<CmsFields>(blankFields),
    [es, setEs] = useState<CmsFields>(blankFields);
  const [shared, setShared] = useState<CmsShared>(blankShared),
    [tab, setTab] = useState<"en" | "es" | "preview">("en");
  const [busy, setBusy] = useState(false),
    [dirty, setDirtyState] = useState(false),
    [creating, setCreating] = useState(id === "new");
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [configured, setConfigured] = useState(true),
    [loaded, setLoaded] = useState(false);
  const dirtyRef = useRef(false);
  function setDirty(value: boolean) { dirtyRef.current = value; setDirtyState(value); }
  const current = items.find((item) => item.id === selected);
  async function load() {
    const data = await adminRequest<ContentLibrary>("content");
    if (dirtyRef.current) return;
    setItems(data.items);
    setConfigured(data.translation_configured);
    setLoaded(true);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message)).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!current || creating) return;
    setKind(current.kind);
    setSlug(current.slug);
    setShared({ ...blankShared(), ...current.shared });
    setEn(current.translations.en?.fields || blankFields());
    setEs(current.translations.es?.fields || blankFields());
    setDirty(false);
  }, [selected, current?.revision, creating]);
  useEffect(() => {
    if (
      dirty ||
      busy ||
      creating ||
      !items.some((i) => ["queued", "running"].includes(i.job?.status || ""))
    )
      return;
    const timer = setInterval(() => {
      load().catch((e) => setError(e.message));
    }, 4000);
    return () => clearInterval(timer);
  }, [items, dirty, busy, creating]);
  async function act(action: string, locale?: "en" | "es") {
    if (!current && action !== "save") return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let result: CmsItem;
      if (action === "save") {
        if (tab === "es" && current)
          result = await adminRequest<CmsItem>(
            `content/${current.id}/spanish`,
            "PUT",
            {
              fields: es,
              revision: current.revision,
              source_version: current.version,
            },
          );
        else
          result = await adminRequest<CmsItem>(
            current ? `content/${current.id}` : "content",
            current ? "PUT" : "POST",
            { kind, slug, shared, fields: en, revision: current?.revision },
          );
      } else
        result = await adminRequest<CmsItem>(
          `content/${current!.id}/${action}`,
          "POST",
          {
            revision: current!.revision,
            ...(locale ? { locale } : {}),
          },
        );
      setItems((old) => [...old.filter((i) => i.id !== result.id), result]);
      setSelected(result.id);
      setCreating(false);
      setDirty(false);
      setMessage(
        {
          save: "Draft saved. Live pages are unchanged until you publish.",
          translate: "Spanish translation queued. You can continue working.",
          review: "Spanish translation approved.",
          publish: `${locale === "es" ? "Spanish" : "English"} edition published.`,
          unpublish: `${locale === "es" ? "Spanish" : "English"} edition unpublished.`,
        }[action] || "Saved.",
      );
      await load();
      if (id === "new") router.replace(`/admin/content/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Images must be 10 MB or smaller.");
      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Upload failed");
      setShared((prev) => ({
        ...prev,
        images: [...(prev.images || []), data.url],
      }));
      setDirty(true);
      setMessage("Image uploaded. Save the English draft to attach it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  useUnsavedChanges(dirty);
  const translation = current?.translations.es;
  return {
    items,
    current,
    creating,
    busy,
    dirty,
    kind,
    slug,
    setKind,
    setSlug,
    setDirty,
    en,
    setEn,
    es,
    setEs,
    shared,
    setShared,
    upload,
    act,
    translation,
    configured,
    loaded,
    error,
    message,
    tab,
    setTab,
    setError,
    load,
  };
}
export type ContentEditorState = ReturnType<typeof useContentEditor>;
