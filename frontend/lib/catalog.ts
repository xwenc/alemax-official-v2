import "server-only";
import { cache } from "react";
import { internalApi } from "./internal-api";
import type { Locale } from "./content";
import type { CmsPublished } from "./cms-types";
import type { SiteCatalog, SiteCategory } from "./catalog-types";
export const getCatalog = cache(
  async (locale: Locale): Promise<SiteCatalog> => {
    const response = await internalApi(`/cms/catalog/${locale}`);
    if (!response.ok)
      throw new Error("Published content is temporarily unavailable");
    const data: CmsPublished = await response.json();
    const categories = data.items
      .filter((i) => i.kind === "category")
      .map((i) => ({
        _id: i.id,
        name: i.fields.title,
        slug: i.slug,
        fields: i.fields,
      }));
    const origins: SiteCategory[] = data.items
      .filter((i) => i.kind === "production-base")
      .map((i) => ({ _id: i.id, name: i.fields.title, slug: i.slug }));
    return {
      cms: true,
      seoTitleSuffix: data.seo?.title_suffix,
      categories,
      products: data.items
        .filter((i) => i.kind === "product")
        .map((i) => ({
          _id: i.id,
          slug: i.slug,
          name: i.fields.title,
          code: i.shared.code || "",
          category:
            categories.find((c) => c.slug === i.shared.category_slug) || null,
          origin: origins.find((o) => o.slug === i.shared.origin_slug) || null,
          image: i.shared.images?.[0] || null,
          images: i.shared.images || [],
          fields: i.fields,
        })),
      pages: data.items
        .filter((i) => ["page", "production-base"].includes(i.kind))
        .map((i) => ({
          path:
            i.kind === "production-base" ? `production-base/${i.slug}` : i.slug,
          title: i.fields.title,
          blocks: i.fields.blocks,
          images: i.shared.images || [],
          fields: i.fields,
        })),
      articles: data.items.filter((i) => i.kind === "article"),
      unavailable: data.unavailable,
    };
  },
);
export function missingTranslation(
  data: SiteCatalog,
  kind: string,
  slug: string,
) {
  return data.unavailable?.some((i) => i.kind === kind && i.slug === slug);
}
