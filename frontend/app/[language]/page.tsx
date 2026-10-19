import Website from "@/components/Website";
import { getCatalog } from "@/lib/catalog";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params }: PageProps) {
  return pageMetadata((await params).language, "");
}
export default async function HomePage({ params }: PageProps) {
  const locale = pageLocale((await params).language);
  return (
    <Website initialLocale={locale} catalogData={await getCatalog(locale)} />
  );
}
