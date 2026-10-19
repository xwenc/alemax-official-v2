"use client";

import { useState } from "react";
import type { Locale } from "@/lib/content";

export default function ProductImage({
  src,
  alt,
  locale,
}: {
  src?: string | null;
  alt: string;
  locale: Locale;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (src && src !== failedSource) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailedSource(src)}
      />
    );
  }
  return (
    <img
      src="/images/product-placeholder.jpg"
      alt={
        locale === "en"
          ? "Product packaging placeholder"
          : "Imagen de referencia del embalaje"
      }
      loading="lazy"
    />
  );
}
