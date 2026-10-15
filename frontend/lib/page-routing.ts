import { notFound } from "next/navigation";
import legacy from "@/lib/legacy-content.json";
import type { Locale } from "@/lib/content";
import { copy } from "@/lib/content";
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
) {
  if (!(language in legacy)) return {};
  const data = legacy[language as Locale];
  const product = data.products.find((p) => path === `products/${p.slug}`);
  const title =
    (path === "products"
      ? data.categories.find((c) => c.slug === query.cat)?.name ||
        { en: "Products", es: "Productos" }[language as Locale]
      : path === "about"
        ? copy[language as Locale].nav[3]
        : path === "production-bases"
          ? {
              en: "Production bases",
              es: "Bases de producción",
            }[language as Locale]
          : undefined) ||
    product?.name ||
    data.pages.find((p) => p.path === path)?.title ||
    "ALEMAX Global Ingredients";
  return {
    title: `${title} | ALEMAX`,
    alternates: {
      canonical: `/${language}/${path}`,
      languages: Object.fromEntries(
        ["en", "es"].map((l) => [l, `/${l}/${path}`]),
      ),
    },
  };
}
