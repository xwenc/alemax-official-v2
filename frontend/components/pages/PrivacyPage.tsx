import type { SiteCatalog } from "@/lib/catalog-types";
import { type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import ContentBody from "./ContentBody";
export default function PrivacyPage({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: SiteCatalog;
}) {
  const page = catalog.pages.find((p) => p.path === "privacy")!;
  return (
    <>
      <PageHeading locale={locale} title={page.title} />
      <section className="legacy-body container">
        <ContentBody page={page}>
          <p>
            {locale === "en"
              ? "Website inquiries are sent to info@alemaxglobal.com by email, including your company, name, email address, region, subject and message. New public inquiries are not stored in the website database."
              : "Las consultas del sitio web se envían por correo a info@alemaxglobal.com e incluyen su empresa, nombre, email, región, asunto y mensaje. Las nuevas consultas públicas no se guardan en la base de datos del sitio web."}
          </p>
        </ContentBody>
      </section>
    </>
  );
}
