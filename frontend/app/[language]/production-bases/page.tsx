import { Suspense } from "react";
import Website from "@/components/Website";
import ProductionBasesPage from "@/components/pages/ProductionBasesPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, "production-bases", await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  return (
    <Website initialLocale={locale}>
      <Suspense>
        <ProductionBasesPage locale={locale} />
      </Suspense>
    </Website>
  );
}
