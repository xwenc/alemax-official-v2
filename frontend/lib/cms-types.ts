import type { RichTextDocument } from "./rich-text";
export type CmsFields = {
  body?: RichTextDocument | null;
  title: string;
  summary: string;
  blocks: { tag: "p" | "h2" | "h3" | "li"; text: string }[];
  seo_title: string;
  seo_description: string;
  image_alt: string;
};
export type CmsShared = {
  code?: string;
  category_slug?: string;
  origin_slug?: string;
  images?: string[];
  sort_order?: number;
};
export type CmsKind =
  "product" | "category" | "production-base" | "page" | "article";
export type CmsTranslation = {
  fields: CmsFields;
  source_version: number;
  status: string;
};
export type CmsSnapshot = {
  fields: CmsFields;
  shared: CmsShared;
  source_version: number;
  published_at: number;
};
export type CmsItem = {
  id: string;
  kind: CmsKind;
  slug: string;
  shared: CmsShared;
  version: number;
  revision: number;
  translations: Partial<Record<"en" | "es", CmsTranslation>>;
  published: Partial<Record<"en" | "es", CmsSnapshot>>;
  job?: { status: string; error: string; attempts: number } | null;
};
export type CmsPublishedItem = CmsSnapshot & {
  id: string;
  kind: CmsKind;
  slug: string;
};
export type CmsPublished = {
  seo?: { title_suffix: string };
  items: CmsPublishedItem[];
  unavailable: { kind: CmsKind; slug: string }[];
};
export type GlobalSeoSettings = {
  title_suffix: Record<"en" | "es", string>;
  revision: number;
};
