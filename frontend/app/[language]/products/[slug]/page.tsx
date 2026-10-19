import { getCatalog, missingTranslation } from "@/lib/catalog";
import TranslationUnavailable from "@/components/pages/TranslationUnavailable";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Website from "@/components/Website";
import ProductDetailPage from "@/components/pages/ProductDetailPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, `products/${slug}`, await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  const data = await getCatalog(locale);
  if (missingTranslation(data, "product", slug!))
    return (
      <Website initialLocale={locale} catalogData={data}>
        <TranslationUnavailable path={`products/${slug}`} />
      </Website>
    );
  if (!data.products.some((p) => p.slug === slug)) notFound();
  return (
    <Website initialLocale={locale} catalogData={data}>
      <Suspense>
        <ProductDetailPage locale={locale} catalog={data} slug={slug!} />
      </Suspense>
    </Website>
  );
}
