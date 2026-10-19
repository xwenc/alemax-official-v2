import type { SiteCatalog } from "@/lib/catalog-types";
import { copy, type Locale } from "@/lib/content";
import ContentBody from "./ContentBody";
import PageHeading from "./PageHeading";
import { pageLabels } from "./content";
import ArticleThumbnail from "../ArticleThumbnail";
export default function ActivityPage({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: SiteCatalog;
}) {
  const data = catalog,
    t = copy[locale],
    labels = pageLabels[locale];
  const contact = `/${locale}/contact`;
  const title = data.pages.find((p) => p.path === "activity")!.title;
  const page = data.pages.find((p) => p.path === "activity");
  return (
    <>
      <PageHeading locale={locale} title={title} />
      <section className="container empty-state">
        {page &&
          (page.blocks.length > 0 ||
            page.fields?.body ||
            page.fields?.summary) && <ContentBody page={page} />}
        {data.articles?.length ? (
          <div className="catalog-grid">
            {data.articles.map((article) => (
              <a
                className="catalog-card update-card"
                key={article.id}
                href={`/${locale}/activity/${article.slug}`}
              >
                <ArticleThumbnail article={article} />
                <div className="update-card-copy">
                  <h3>{article.fields.title}</h3>
                  <p>{article.fields.summary}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p>{labels.empty}</p>
        )}
        <a className="button" href={contact}>
          {t.nav[5]} ↗
        </a>
      </section>
    </>
  );
}
