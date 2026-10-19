import { notFound } from "next/navigation";
import { getCatalog, missingTranslation } from "@/lib/catalog";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import Website from "@/components/Website";
import AboutPage from "@/components/pages/AboutPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";

export async function generateMetadata({ params }: PageProps) {
  return pageMetadata((await params).language, "about");
}

export default async function Page({ params }: PageProps) {
  const locale = pageLocale((await params).language);
  const data = await getCatalog(locale);
  if (missingTranslation(data, "page", "about"))
    return (
      <Website initialLocale={locale} catalogData={data}>
        <TranslationUnavailable path={"about"} />
      </Website>
    );
  if (data.cms && !data.pages.some((p) => p.path === "about")) notFound();
  return (
    <Website initialLocale={locale} catalogData={data}>
      <AboutPage locale={locale} catalog={data} />
    </Website>
  );
}
