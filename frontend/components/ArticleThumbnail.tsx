"use client";

import { useState } from "react";
import type { CmsPublishedItem } from "@/lib/cms-types";
import { contentThumbnail } from "@/lib/rich-text";

export default function ArticleThumbnail({
  article,
}: {
  article: CmsPublishedItem;
}) {
  const image = contentThumbnail(
    article.shared.images || [],
    article.fields.body,
    article.fields.image_alt || article.fields.title,
  );
  const [failed, setFailed] = useState<string | null>(null);
  const available = image && failed !== image.src;
  return (
    <div className="article-thumbnail">
      <img
        src={available ? image.src : "/images/logo.svg"}
        alt={available ? image.alt : "ALEMAX Global Ingredients"}
        data-placeholder={!available || undefined}
        loading="lazy"
        onError={available ? () => setFailed(image.src) : undefined}
      />
    </div>
  );
}
