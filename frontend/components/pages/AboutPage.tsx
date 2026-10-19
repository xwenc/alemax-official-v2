import type { SiteCatalog } from "@/lib/catalog-types";
import { copy, type Locale } from "@/lib/content";
import ContentBody from "./ContentBody";
import PageHeading from "./PageHeading";

export default function AboutPage({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: SiteCatalog;
}) {
  const t = copy[locale];
  const page = catalog.pages.find((p) => p.path === "about");
  if (page)
    return (
      <>
        <PageHeading locale={locale} title={page.title} />
        <section className="about-page container">
          {page.images[0] && (
            <img
              className="about-page-image"
              src={page.images[0]}
              alt={page.fields?.image_alt || page.title}
            />
          )}
          <div className="about-page-copy">
            <ContentBody page={{ ...page, images: [] }} />
            <div className="about-page-actions">
              <a className="button" href={`/${locale}/contact`}>
                {t.inquire} ↗
              </a>
              <a className="text-link" href={`/${locale}/production-bases`}>
                {t.aboutCta} ↗
              </a>
            </div>
          </div>
        </section>
      </>
    );
  return null;
}
