import { Suspense } from "react";
import Website from "@/components/Website";
import ProductsPage from "@/components/pages/ProductsPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params, searchParams }: PageProps) {
  const { language, slug } = await params;
  return pageMetadata(language, "products", await searchParams);
}
export default async function Page({ params }: PageProps) {
  const { language, slug } = await params;
  const locale = pageLocale(language);
  return (
    <Website initialLocale={locale}>
      <Suspense>
        <ProductsPage locale={locale} />
      </Suspense>
    </Website>
  );
}
