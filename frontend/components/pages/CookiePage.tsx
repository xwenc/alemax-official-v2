import legacy from "@/lib/legacy-content.json";
import { type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import ContentBody from "./ContentBody";
export default function CookiePage({ locale }: { locale: Locale }) {
  const page = legacy[locale].pages.find((p) => p.path === "cookie")!;
  return (
    <>
      <PageHeading locale={locale} title={page.title} />
      <section className="legacy-body container">
        <ContentBody page={page}></ContentBody>
      </section>
    </>
  );
}
