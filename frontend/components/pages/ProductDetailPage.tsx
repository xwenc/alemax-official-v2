import type { SiteCatalog } from "@/lib/catalog-types";
import { copy, type Locale } from "@/lib/content";
import ContentBody from "./ContentBody";
import PageHeading from "./PageHeading";
import { pageLabels } from "./content";
import { notFound } from "next/navigation";
export default function ProductDetailPage({
  locale,
  catalog,
  slug,
}: {
  locale: Locale;
  catalog: SiteCatalog;
  slug: string;
}) {
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const labels = pageLabels[locale],
    t = copy[locale],
    contact = `/${locale}/contact`;
  return (
    <>
      <PageHeading locale={locale} title={product.name} compact />
      <section className="product-detail container">
        <div>
          <p className="eyebrow green">{product.category?.name}</p>
          <h2>{product.name}</h2>
          <dl>
            <dt>{labels.code}</dt>
            <dd>{product.code || "Ingredient"}</dd>
            {product.origin && (
              <>
                <dt>{labels.origin}</dt>
                <dd>
                  <a href={`/${locale}/production-base/${product.origin.slug}`}>
                    {product.origin.name} ↗
                  </a>
                </dd>
              </>
            )}
          </dl>
          {product.fields && (
            <ContentBody
              page={{
                path: `products/${slug}`,
                title: product.name,
                blocks: product.fields.blocks,
                images: product.images || [],
                fields: product.fields,
              }}
            />
          )}
          <p>{labels.spec}</p>
          <a
            className="button"
            href={`${contact}?subject=${encodeURIComponent(product.name)}`}
          >
            {t.inquire} ↗
          </a>
        </div>
        <aside>
          <a
            className="text-link"
            href={`/${locale}/products?cat=${product.category?.slug || ""}`}
          >
            {labels.back} ↗
          </a>
          <p>{product.category?.name}</p>
        </aside>
      </section>
    </>
  );
}
