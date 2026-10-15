import { notFound } from "next/navigation";
import legacy from "@/lib/legacy-content.json";
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
  if (!legacy[locale].products.some((p) => p.slug === slug)) notFound();
  return (
    <Website initialLocale={locale}>
      <Suspense>
        <ProductDetailPage locale={locale} slug={slug!} />
      </Suspense>
    </Website>
  );
}
