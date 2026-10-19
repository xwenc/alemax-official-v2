"use client";

import type { Locale } from "@/lib/content";

export default function CookiePreferencesButton({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <button
      className="button"
      onClick={() =>
        window.dispatchEvent(new Event("alemax:open-cookie-settings"))
      }
    >
      {locale === "en"
        ? "Change cookie preferences"
        : "Cambiar preferencias de cookies"}
    </button>
  );
}
