import { notFound } from "next/navigation";
import { getCatalog, missingTranslation } from "./catalog";
import type { Locale } from "./content";
import type { Metadata } from "next";
export type PageProps = {
  params: Promise<{ language: string; slug?: string }>;
  searchParams: Promise<{ cat?: string }>;
};
export function pageLocale(language: string): Locale {
  if (language !== "en" && language !== "es") notFound();
  return language;
}
export async function pageMetadata(
  language: string,
  path: string,
  query: { cat?: string } = {},
): Promise<Metadata> {
  const locale = pageLocale(language),
    data = await getCatalog(locale);
  const product = data.products.find((p) => path === `products/${p.slug}`);
  const page = data.pages.find((p) => p.path === (path || "home"));
  const article = data.articles?.find((a) => path === `activity/${a.slug}`);
  const category =
    path === "products" && query.cat
      ? data.categories.find((c) => c.slug === query.cat)
      : undefined;
  const fields =
    category?.fields || product?.fields || page?.fields || article?.fields;
  const title =
    fields?.seo_title ||
    (path === "products"
      ? data.categories.find((c) => c.slug === query.cat)?.name ||
        { en: "Products", es: "Productos" }[locale]
      : path === "production-bases"
        ? { en: "Production bases", es: "Bases de producción" }[locale]
        : product?.name ||
          page?.title ||
          article?.fields.title ||
          (path === "about"
            ? { en: "About us", es: "Sobre nosotros" }[locale]
            : "ALEMAX Global Ingredients"));
  const kind = path.startsWith("products/")
    ? "product"
    : path.startsWith("production-base/")
      ? "production-base"
      : path.startsWith("activity/")
        ? "article"
        : "page";
  const slug = path.split("/").at(-1) || "";
  const missing = missingTranslation(data, kind, slug);
  const otherLocale = locale === "en" ? "es" : "en";
  const other = await getCatalog(otherLocale);
  const exists = (catalog: typeof data) =>
    ["", "products", "production-bases"].includes(path) ||
    catalog.pages.some((p) => p.path === path) ||
    catalog.products.some((p) => `products/${p.slug}` === path) ||
    !!catalog.articles?.some((a) => `activity/${a.slug}` === path);
  const languages: Record<string, string> = {};
  if (exists(data) && !missing) languages[locale] = `/${locale}/${path}`;
  if (exists(other)) languages[otherLocale] = `/${otherLocale}/${path}`;

  return {
    title: `${title} | ALEMAX`,
    description: fields?.seo_description || fields?.summary || undefined,
    ...(missing ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: `/${language}/${path}`,
      languages,
    },
  };
}
