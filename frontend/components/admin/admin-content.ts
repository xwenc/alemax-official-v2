import type { CmsFields, CmsItem, CmsKind, CmsShared } from "@/lib/cms-types";
export type ContentLibrary = {
  items: CmsItem[];
  translation_configured: boolean;
};
export const blankFields = (): CmsFields => ({
  title: "",
  summary: "",
  blocks: [],
  seo_title: "",
  seo_description: "",
  image_alt: "",
});
export const blankShared = (): CmsShared => ({
  code: "",
  category_slug: "",
  origin_slug: "",
  images: [],
  sort_order: 0,
});
export const kinds: CmsKind[] = [
  "page",
  "product",
  "category",
  "production-base",
  "article",
];
export const sections = [
  { href: "/admin/overview", title: "Overview", icon: "overview" },
  {
    href: "/admin/products",
    title: "Products",
    kind: "product",
    icon: "product",
  },
  {
    href: "/admin/categories",
    title: "Categories",
    kind: "category",
    icon: "category",
  },
  {
    href: "/admin/production-bases",
    title: "Production bases",
    kind: "production-base",
    icon: "base",
  },
  { href: "/admin/pages", title: "Pages", kind: "page", icon: "page" },
  {
    href: "/admin/updates",
    title: "Updates",
    kind: "article",
    icon: "updates",
  },
  { href: "/admin/settings", title: "Administrator", icon: "settings" },
] as const;
export function kindName(kind: string) {
  return (
    {
      page: "Pages",
      product: "Products",
      category: "Categories",
      "production-base": "Production bases",
      article: "Updates",
    }[kind] || kind
  );
}
export function sectionUrl(kind: CmsKind) {
  return (
    sections.find((s) => "kind" in s && s.kind === kind)?.href ||
    "/admin/overview"
  );
}
export const publicContentUrl = (kind: CmsKind, slug: string, locale: string) =>
  `/${locale}/${kind === "page" ? (slug === "home" ? "" : slug) : kind === "product" ? `products/${slug}` : kind === "production-base" ? `production-base/${slug}` : kind === "article" ? `activity/${slug}` : `products?cat=${slug}`}`;
export async function adminRequest<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  if (response.status === 401) {
    window.location.assign("/admin");
    throw new Error("Your session expired. Please sign in again.");
  }
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.detail === "string"
        ? result.detail
        : "Check the fields and try again.",
    );
  return result;
}
export function publishedDate(item: CmsItem) {
  return Math.max(
    item.published.en?.published_at || 0,
    item.published.es?.published_at || 0,
  );
}
export function formatDate(value: number) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Madrid",
      }).format(new Date(value * 1000))
    : "—";
}
