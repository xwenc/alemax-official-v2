import { getCatalog, missingTranslation } from "@/lib/catalog";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Website from "@/components/Website";
import ProductionBasePage from "@/components/pages/ProductionBasePage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, `production-base/${slug}`, await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  const data = await getCatalog(locale);
  if (missingTranslation(data, "production-base", slug!))
    return (
      <Website initialLocale={locale} catalogData={data}>
        <TranslationUnavailable path={`production-base/${slug}`} />
      </Website>
    );
  if (!data.pages.some((p) => p.path === `production-base/${slug}`)) notFound();
  return (
    <Website initialLocale={locale} catalogData={data}>
      <Suspense>
        <ProductionBasePage locale={locale} catalog={data} slug={slug!} />
      </Suspense>
    </Website>
  );
}
