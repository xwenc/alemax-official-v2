"use client";
import { useEffect, useState } from "react";
import { adminRequest, type ContentLibrary } from "./admin-content";
export default function useContentLibrary() {
  const [data, setData] = useState<ContentLibrary>({
    items: [],
    translation_configured: true,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await adminRequest<ContentLibrary>("content"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load content");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    adminRequest<ContentLibrary>("content")
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return { ...data, loading, error, refresh };
}
