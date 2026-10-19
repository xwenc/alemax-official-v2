import type { SiteCatalog } from "@/lib/catalog-types";
import { type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import ContentBody from "./ContentBody";
export default function CookiePage({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: SiteCatalog;
}) {
  const page = catalog.pages.find((p) => p.path === "cookie")!;
  return (
    <>
      <PageHeading locale={locale} title={page.title} />
      <section className="legacy-body container">
        <ContentBody page={page}></ContentBody>
      </section>
    </>
  );
}
