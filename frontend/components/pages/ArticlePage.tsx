import type { Locale } from "@/lib/content";
import type { CmsPublishedItem } from "@/lib/cms-types";
import PageHeading from "./PageHeading";
import ContentBody from "./ContentBody";
export default function ArticlePage({
  locale,
  article,
}: {
  locale: Locale;
  article: CmsPublishedItem;
}) {
  return (
    <>
      <PageHeading locale={locale} title={article.fields.title} />
      <section className="legacy-body container">
        <ContentBody
          page={{
            path: `activity/${article.slug}`,
            title: article.fields.title,
            blocks: article.fields.blocks,
            images: article.shared.images || [],
            fields: article.fields,
          }}
        />
      </section>
    </>
  );
}
