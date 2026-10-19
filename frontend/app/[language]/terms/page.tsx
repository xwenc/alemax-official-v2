import { notFound } from "next/navigation";
import { getCatalog, missingTranslation } from "@/lib/catalog";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import { Suspense } from "react";
import Website from "@/components/Website";
import TermsPage from "@/components/pages/TermsPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, "terms", await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  const data = await getCatalog(locale);
  if (missingTranslation(data, "page", "terms"))
    return (
      <Website initialLocale={locale} catalogData={data}>
        <TranslationUnavailable path={"terms"} />
      </Website>
    );
  if (data.cms && !data.pages.some((p) => p.path === "terms")) notFound();
  return (
    <Website initialLocale={locale} catalogData={data}>
      <Suspense>
        <TermsPage locale={locale} catalog={data} />
      </Suspense>
    </Website>
  );
}
