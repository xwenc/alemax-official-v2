import { notFound } from "next/navigation";
import Website from "@/components/Website";
import ArticlePage from "@/components/pages/ArticlePage";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import { getCatalog, missingTranslation } from "@/lib/catalog";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, `activity/${slug}`);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params,
    locale = pageLocale(language),
    catalog = await getCatalog(locale);
  if (missingTranslation(catalog, "article", slug!))
    return (
      <Website initialLocale={locale} catalogData={catalog}>
        <TranslationUnavailable path={`activity/${slug}`} />
      </Website>
    );
  const article = catalog.articles?.find((a) => a.slug === slug);
  if (!article) notFound();
  return (
    <Website initialLocale={locale} catalogData={catalog}>
      <ArticlePage locale={locale} article={article} />
    </Website>
  );
}
