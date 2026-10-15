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
  return (
    <Website initialLocale={locale}>
      <Suspense>
        <ContactPage locale={locale} />
      </Suspense>
    </Website>
  );
}
