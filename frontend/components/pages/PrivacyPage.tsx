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
        <article className="legacy-prose">
          <h2>
            {locale === "en"
              ? "Daily website visit statistics"
              : "Estadísticas de visitas diarias"}
          </h2>
          <p>
            {locale === "en"
              ? "ALEMAX Global Ingredients SL measures daily visits to understand website usage. Our server processes the connection IP to create a secret-keyed identifier that changes each calendar day (Europe/Madrid). The statistics database stores no plain IP, browsing history or cross-day visitor identifier. No analytics cookie or browser storage is used for this measurement. Daily deduplication identifiers older than yesterday are removed on subsequent statistics requests; daily aggregate counts are retained. Shared IP addresses count as one visit per day. For privacy questions or to exercise your rights, contact info@alemaxglobal.com."
              : "ALEMAX Global Ingredients SL mide las visitas diarias para conocer el uso del sitio. El servidor procesa la IP de conexión para generar un identificador con clave secreta que cambia cada día natural (Europe/Madrid). La base de estadísticas no guarda la IP en claro, el historial de navegación ni un identificador del visitante entre días. Esta medición no utiliza cookies de análisis ni almacenamiento del navegador. Los identificadores anteriores a ayer se eliminan en posteriores solicitudes de estadísticas; se conservan los recuentos diarios agregados. Las IP compartidas cuentan como una visita al día. Para consultas de privacidad o para ejercer tus derechos, contacta con info@alemaxglobal.com."}
          </p>
        </article>
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
