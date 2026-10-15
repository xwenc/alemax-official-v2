import Website from "@/components/Website";
import AboutPage from "@/components/pages/AboutPage";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";

export async function generateMetadata({ params }: PageProps) {
  return pageMetadata((await params).language, "about");
}

export default async function Page({ params }: PageProps) {
  const locale = pageLocale((await params).language);
  return (
    <Website initialLocale={locale}>
      <AboutPage locale={locale} />
    </Website>
  );
}
