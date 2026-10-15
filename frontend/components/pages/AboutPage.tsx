import { copy, type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";

export default function AboutPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <>
      <PageHeading locale={locale} title={t.nav[3]} />
      <section className="about-page container">
        <img
          className="about-page-image"
          src="/images/production.jpg"
          alt={
            locale === "en"
              ? "Ingredient production facilities"
              : "Instalaciones de producción de ingredientes"
          }
        />
        <div className="about-page-copy">
          <p className="eyebrow green">{t.eyebrow}</p>
          <h2>{t.aboutTitle}</h2>
          <p>{t.aboutText}</p>
          <h3>{t.basesLabel}</h3>
          <p>{t.basesText}</p>
          <a className="text-link" href={`/${locale}/production-bases`}>
            {t.aboutCta} ↗
          </a>
          <h3>{t.productsLabel}</h3>
          <p>{t.brandText}</p>
          <div className="about-page-actions">
            <a className="button" href={`/${locale}/contact`}>
              {t.inquire} ↗
            </a>
            <a className="text-link" href={`/${locale}/products`}>
              {t.all} ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
