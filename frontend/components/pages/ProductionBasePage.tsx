import legacy from "@/lib/legacy-content.json";
import { copy, type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import ContentBody from "./ContentBody";
import { notFound } from "next/navigation";
export default function ProductionBasePage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const path = `production-base/${slug}`,
    data = legacy[locale],
    t = copy[locale],
    contact = `/${locale}/contact`;
  const page = data.pages.find((p) => p.path === path);
  if (!page) notFound();
  const sourceProducts = data.products.filter(
    (p) => `production-base/${p.origin?.slug}` === path,
  );
  return (
    <>
      <PageHeading locale={locale} title={page.title} />
      <section className="legacy-body container">
        <ContentBody page={page} production />
        <div className="section-heading">
          <h2>{t.nav[2]}</h2>
          <a className="text-link" href={contact}>
            {t.inquire} ↗
          </a>
        </div>
        <div className="catalog-grid">
          {sourceProducts.map((p) => (
            <a
              className="catalog-card"
              key={p._id}
              href={`/${locale}/products/${p.slug}`}
            >
              <h3>{p.name}</h3>
              <p>{p.code}</p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
