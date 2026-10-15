import { notFound } from "next/navigation";
import legacy from "@/lib/legacy-content.json";
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
  if (!legacy[locale].pages.some((p) => p.path === `production-base/${slug}`))
    notFound();
  return (
    <Website initialLocale={locale}>
      <Suspense>
        <ProductionBasePage locale={locale} slug={slug!} />
      </Suspense>
    </Website>
  );
}
