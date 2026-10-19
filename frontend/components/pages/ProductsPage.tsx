"use client";
import type { SiteCatalog } from "@/lib/catalog-types";
import { copy, type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import { pageLabels } from "./content";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
export default function ProductsPage({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: SiteCatalog;
}) {
  const data = catalog,
    t = copy[locale],
    labels = pageLabels[locale];
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const category = params.get("cat") || "";
  const title =
    data.categories.find((c) => c.slug === category)?.name || labels.catalog;
  const filtered = data.products.filter(
    (p) =>
      (!category || p.category?.slug === category) &&
      `${p.name} ${p.code || ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading locale={locale} title={title}>
        <p>
          {locale === "en"
            ? "We offer targeted blended product combinations tailored to different food production processes."
            : "Ofrecemos combinaciones de productos adaptadas a los distintos procesos de producción alimentaria."}
        </p>
      </PageHeading>
      <section className="catalog-section container">
        <div className="catalog-tools">
          <label>
            {labels.search}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
            />
          </label>
          <div className="category-links">
            <a
              className={!category ? "active" : ""}
              href={`/${locale}/products`}
            >
              {labels.all}
            </a>
            {data.categories.map((c) => (
              <a
                className={category === c.slug ? "active" : ""}
                key={c.slug}
                href={`/${locale}/products?cat=${c.slug}`}
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
        <div className="catalog-grid">
          {filtered.map((p) => (
            <a
              className="catalog-card"
              key={p._id}
              href={`/${locale}/products/${p.slug}`}
            >
              <p className="eyebrow green">{p.category?.name || "ALEMAX"}</p>
              <h3>{p.name}</h3>
              <p>{p.code || "Ingredient"}</p>
              <span className="text-link">{t.inquire} ↗</span>
            </a>
          ))}
        </div>
        {!filtered.length && <p className="empty-state">{labels.none}</p>}
      </section>
    </>
  );
}
