import { notFound } from "next/navigation";
import legacy from "@/lib/legacy-content.json";
import Website from "@/components/Website";
import LegacyPage from "@/components/LegacyPage";
import type { Locale } from "@/lib/content";
type Props = {
  params: Promise<{ language: string; slug?: string[] }>;
  searchParams: Promise<{ cat?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { language, slug = [] } = await params;
  if (!(language in legacy)) return {};
  const data = legacy[language as Locale],
    path = slug.join("/");
  const product = data.products.find((p) => path === `products/${p.slug}`);
  const query = await searchParams;
  const title =
    (path === "products"
      ? data.categories.find((c) => c.slug === query.cat)?.name ||
        { en: "Products", es: "Productos" }[language as Locale]
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
export default async function Page({ params }: Props) {
  const { language, slug = [] } = await params;
  if (!["en", "es"].includes(language)) notFound();
  const locale = language as Locale,
    path = slug.join("/"),
    data = legacy[locale];
  if (!path) return <Website initialLocale={locale} />;
  if (
    !["products", "production-bases"].includes(path) &&
    !data.pages.some((p) => p.path === path) &&
    !data.products.some((p) => path === `products/${p.slug}`)
  )
    notFound();
  return (
    <Website initialLocale={locale}>
      <LegacyPage locale={locale} path={path} />
    </Website>
  );
}
