"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!/^\/(en|es)(\/|$)/.test(pathname)) return;
    let sent = false;
    const record = () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      void fetch("/api/visits", {
        method: "POST",
        credentials: "omit",
        keepalive: true,
      }).catch(() => {});
    };
    record();
    document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [pathname]);
  return null;
}
