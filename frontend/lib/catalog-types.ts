import type { CmsFields, CmsPublishedItem } from "./cms-types";
export type SiteCategory = {
  _id: string;
  name: string;
  slug: string;
  fields?: CmsFields;
};
export type SiteProduct = {
  _id: string;
  name: string;
  slug: string;
  code: string | null;
  category: SiteCategory | null;
  origin: SiteCategory | null;
  image?: string | null;
  fields?: CmsFields;
  images?: string[];
};
export type SitePage = {
  path: string;
  title: string;
  blocks: { tag: string; text: string }[];
  images: string[];
  fields?: CmsFields;
};
export type SiteCatalog = {
  categories: SiteCategory[];
  products: SiteProduct[];
  pages: SitePage[];
  articles?: CmsPublishedItem[];
  unavailable?: { kind: string; slug: string }[];
  cms?: boolean;
};
