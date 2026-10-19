import { notFound } from "next/navigation";
import { getCatalog, missingTranslation } from "@/lib/catalog";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import { Suspense } from "react";
import Website from "@/components/Website";
import ContactPage from "@/components/pages/ContactPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, "contact", await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  const data = await getCatalog(locale);
  if (missingTranslation(data, "page", "contact"))
    return (
      <Website initialLocale={locale} catalogData={data}>
        <TranslationUnavailable path={"contact"} />
      </Website>
    );
  if (data.cms && !data.pages.some((p) => p.path === "contact")) notFound();
  return (
    <Website initialLocale={locale} catalogData={data}>
      <Suspense>
        <ContactPage locale={locale} catalog={data} />
      </Suspense>
    </Website>
  );
}
