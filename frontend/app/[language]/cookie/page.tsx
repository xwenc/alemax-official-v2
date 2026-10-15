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
  return (
    <Website initialLocale={locale}>
      <Suspense>
        <CookiePage locale={locale} />
      </Suspense>
    </Website>
  );
}
