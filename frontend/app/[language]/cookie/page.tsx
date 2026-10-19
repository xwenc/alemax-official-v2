import { notFound } from "next/navigation";
import { getCatalog, missingTranslation } from "@/lib/catalog";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import { Suspense } from "react";
import Website from "@/components/Website";
import CookiePage from "@/components/pages/CookiePage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, "cookie", await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  const data = await getCatalog(locale);
  if (missingTranslation(data, "page", "cookie"))
    return (
      <Website initialLocale={locale} catalogData={data}>
        <TranslationUnavailable path={"cookie"} />
      </Website>
    );
  if (data.cms && !data.pages.some((p) => p.path === "cookie")) notFound();
  return (
    <Website initialLocale={locale} catalogData={data}>
      <Suspense>
        <CookiePage locale={locale} catalog={data} />
      </Suspense>
    </Website>
  );
}
