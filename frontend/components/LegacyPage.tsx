"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import legacy from "@/lib/legacy-content.json";
import { copy, Locale } from "@/lib/content";
import InquiryForm from "./InquiryForm";
export default function LegacyPage({
  locale,
  path,
}: {
  locale: Locale;
  path: string;
}) {
  const data = legacy[locale],
    t = copy[locale],
    params = useSearchParams();
  const [query, setQuery] = useState("");
  const category = params.get("cat") || "";
  const page = data.pages.find((p) => p.path === path);
  const product = data.products.find((p) => path === `products/${p.slug}`);
  const categoryName = data.categories.find((c) => c.slug === category)?.name;
  const labels = {
    en: {
      catalog: "Ingredient portfolio",
      network: "Production bases",
      all: "All categories",
      empty: "No articles have been published yet.",
      none: "No products match your search.",
      origin: "Production origin",
      code: "Product code",
      back: "Back to products",
      search: "Search ingredients",
      spec: "Contact our team for technical specifications, documentation and availability.",
    },
    es: {
      catalog: "Catálogo de ingredientes",
      network: "Bases de producción",
      all: "Todas las categorías",
      empty: "Todavía no se han publicado artículos.",
      none: "No hay productos para esta búsqueda.",
      origin: "Origen de producción",
      code: "Código del producto",
      back: "Volver a productos",
      search: "Buscar ingredientes",
      spec: "Contacte con nuestro equipo para obtener especificaciones, documentación y disponibilidad.",
    },
  }[locale];
  const title =
    product?.name ||
    (path === "products"
      ? categoryName || labels.catalog
      : path === "production-bases"
        ? labels.network
        : page?.title);
  const contact = `/${locale}/contact`;
  const filtered = data.products.filter(
    (p) =>
      (!category || p.category?.slug === category) &&
      `${p.name} ${p.code || ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const origins = data.pages.filter((p) =>
    p.path.startsWith("production-base/"),
  );
  const sourceProducts = product
    ? [product]
    : data.products.filter((p) => `production-base/${p.origin?.slug}` === path);
  return (
    <>
      <section className="inner-heading container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href={`/${locale}`}>ALEMAX</a>
          <span>/</span>
          <span>{title}</span>
        </nav>
        <p className="eyebrow green">ALEMAX GLOBAL INGREDIENTS</p>
        <h1>{title}</h1>
        {path === "products" && (
          <p>
            {locale === "en"
              ? "We offer targeted blended product combinations tailored to different food production processes."
              : "Ofrecemos combinaciones de productos adaptadas a los distintos procesos de producción alimentaria."}
          </p>
        )}
      </section>
      {path === "products" ? (
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
      ) : path === "production-bases" ? (
        <section className="origin-grid container">
          {origins.map((p, i) => (
            <a
              href={`/${locale}/${p.path}`}
              className="origin-card"
              key={p.path}
            >
              <img
                src={
                  p.images[0] ||
                  `/images/${["potassium.jpg", "silica.jpg", "phosphates.jpg", "starch.png", "hydrocolloids.png", "emulsifiers.png"][i]}`
                }
                alt={p.title}
              />
              <div>
                <p className="eyebrow green">0{i + 1}</p>
                <h3>{p.title} ↗</h3>
              </div>
            </a>
          ))}
        </section>
      ) : path === "contact" ? (
        <section className="contact-page container">
          <div className="contact-details">
            <h3>{t.nav[5]}</h3>
            <p>
              C. Río Ebro, 15-2A
              <br />
              28947 Fuenlabrada
              <br />
              {t.address}
            </p>
            <a href="mailto:info@alemaxglobal.com">info@alemaxglobal.com</a>
            <a href="tel:+34614466828">+34 614 466 828</a>
          </div>
          <InquiryForm locale={locale} subject={params.get("subject") || ""} />
        </section>
      ) : path === "activity" ? (
        <section className="container empty-state">
          <p>{labels.empty}</p>
          <a className="button" href={contact}>
            {t.nav[5]} ↗
          </a>
        </section>
      ) : product ? (
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
                    <a
                      href={`/${locale}/production-base/${product.origin.slug}`}
                    >
                      {product.origin.name} ↗
                    </a>
                  </dd>
                </>
              )}
            </dl>
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
      ) : (
        <section className="legacy-body container">
          {page?.images.length ? (
            <div className="origin-gallery">
              {page.images.slice(0, 3).map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt={`${page.title} ${i + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}
          <article className="legacy-prose">
            {page?.blocks
              .filter(
                (b) =>
                  !path.startsWith("production-base/") ||
                  ["p", "h2"].includes(b.tag),
              )
              .map((b, i) =>
                b.tag.startsWith("h") ? (
                  <h2 key={i}>{b.text}</h2>
                ) : (
                  <p
                    className={b.tag === "li" ? "legal-list-item" : ""}
                    key={i}
                  >
                    {b.text}
                  </p>
                ),
              )}
          </article>
          {path.startsWith("production-base/") && (
            <>
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
            </>
          )}
        </section>
      )}
    </>
  );
}
