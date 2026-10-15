import Website from "@/components/Website";
import { pageLocale, pageMetadata, type PageProps } from "@/lib/page-routing";
export async function generateMetadata({ params }: PageProps) {
  return pageMetadata((await params).language, "");
}
export default async function HomePage({ params }: PageProps) {
  return <Website initialLocale={pageLocale((await params).language)} />;
}
