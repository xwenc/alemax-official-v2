"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { copy, Locale } from "@/lib/content";
import InquiryForm from "./InquiryForm";
import CookieConsent from "./CookieConsent";
import VisitTracker from "./VisitTracker";
import ProductImage from "./ProductImage";
import ArticleThumbnail from "./ArticleThumbnail";
import type { SiteCatalog } from "@/lib/catalog-types";
const image = (file: string) => `/images/${file}`;
export default function Website({
  children,
  catalogData,
  initialLocale = "en",
}: {
  children?: ReactNode;
  catalogData: SiteCatalog;
  initialLocale?: Locale;
}) {
  const locale = initialLocale;
  const [slide, setSlide] = useState(0),
    [compact, setCompact] = useState(false),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [subject, setSubject] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    searchDialog = useRef<HTMLDialogElement>(null);
  const t = copy[locale];
  const catalog = catalogData;
  const home = `/${locale}`;
  const bases = catalog.pages
    .filter((page) => page.path.startsWith("production-base/"))
    .map((page) => ({
      id: page.path,
      name: page.title,
      image: page.images[0],
      desc: page.fields?.summary || "",
    }));
  const products = catalog.products.map((product) => ({
    ...product,
    id: product.slug,
    summary: product.fields?.summary || "",
  }));
  const baseUrl = (id: string) => `${home}/${id}`;
  const categoryUrl = (slug: string) =>
    `${home}/products?cat=${encodeURIComponent(slug)}`;
  const destinations = [
    `${home}#production-bases`,
    `${home}/production-bases`,
    `${home}/products`,
    `${home}/about`,
    `${home}/activity`,
    `${home}/contact`,
  ];
  useEffect(() => {
    // Use separate thresholds so small scroll movements cannot toggle the header repeatedly.
    const scroll = () => {
      const y = Math.max(0, window.scrollY);
      setCompact((current) => (current ? y > 40 : y > 80));
    };
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        setSlide((s) => (s + 1) % 2);
    }, 9000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (selected) {
      const b = bases.find((b) => b.id === selected);
      const product = catalog.products.find((p) => p.slug === selected);
      window.location.href = b
        ? baseUrl(b.id)
        : product
          ? `${home}/products/${product.slug}`
          : `${home}/products`;
    } else dialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (search) searchDialog.current?.showModal();
    else searchDialog.current?.close();
  }, [search]);
  const switchLanguage = (lang: Locale) => {
    const u = new URL(window.location.href);
    u.pathname = /^\/(en|es)(\/|$)/.test(u.pathname)
      ? u.pathname.replace(/^\/(en|es)/, `/${lang}`)
      : `/${lang}`;
    u.searchParams.delete("lang");
    window.location.href = u.pathname + u.search + u.hash;
  };
  const go = (id: string) => {
    setMenu(false);
    setSearch(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const ask = (text: string) => {
    setSubject(text);
    setSelected(null);
    go("contact");
  };
  const item = products.find((p) => p.id === selected);
  const base = bases.find((p) => p.id === selected);
  const searchItems = [
    ...catalog.products.map((p) => ({
      id: p.slug,
      title: p.name,
      kind: p.code || p.category?.name || "ALEMAX",
    })),
    ...bases.map((b) => ({ id: b.id, title: b.name, kind: t.nav[1] })),
  ].filter((p) =>
    `${p.title} ${p.kind}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <VisitTracker />
      <CookieConsent locale={locale} />
      <a className="skip-link" href="#main">
        {locale === "en" ? "Skip to content" : "Ir al contenido"}
      </a>
      <header className={`site-header ${compact ? "compact" : ""}`}>
        <a className="logo" href={home} aria-label="ALEMAX home">
          <img src={image("logo.svg")} alt="ALEMAX Global Ingredients" />
        </a>
        <div className="header-right">
          <div className="header-tools">
            <button onClick={() => setSearch(true)} aria-label={t.search}>
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="10.5" cy="10.5" r="7" />
                <path d="m16 16 5 5" />
              </svg>
            </button>
            <span className="tool-divider" />
            <button
              lang="en"
              className={locale === "en" ? "active" : ""}
              onClick={() => switchLanguage("en")}
            >
              EN
            </button>
            <span>/</span>
            <button
              lang="es"
              className={locale === "es" ? "active" : ""}
              onClick={() => switchLanguage("es")}
            >
              ES
            </button>
          </div>
          <nav aria-label="Main navigation" className={menu ? "open" : ""}>
            {t.nav.map((label, i) => (
              <div className="nav-item" key={label}>
                <a href={destinations[i]} onClick={() => setMenu(false)}>
                  {label}
                  {i === 1 || i === 2 ? (
                    <svg
                      className="chevron"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      fill="none"
                    >
                      <path
                        d="m4 6 4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </a>
                {i === 1 && (
                  <div className="submenu">
                    {bases.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelected(b.id);
                          setMenu(false);
                        }}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
                {i === 2 && (
                  <div className="submenu">
                    {catalog.categories.map((p) => (
                      <a key={p.slug} href={`${home}/products?cat=${p.slug}`}>
                        {p.name.toLocaleLowerCase(locale)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
        <button
          className={`menu-toggle ${compact ? "show" : ""}`}
          aria-label={menu ? t.close : "Menu"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>
      <main id="main">
        {children || (
          <>
            <section
              className="hero"
              aria-label={
                locale === "en"
                  ? "Company introduction"
                  : "Presentación de empresa"
              }
            >
              <div
                className="hero-picture"
                style={{
                  backgroundImage: `url(${image(slide === 0 ? "hero.jpg" : "equipment.jpg")})`,
                }}
              />
              <div className="hero-shade" />
              <div className="hero-pagination" role="group" aria-label="Slides">
                {[0, 1].map((i) => (
                  <button
                    key={i}
                    className={slide === i ? "current" : ""}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    aria-pressed={slide === i}
                  />
                ))}
              </div>
              <div className="hero-caption">
                <p className="eyebrow">{t.eyebrow[slide]}</p>
                <h1>{t.hero[slide]}</h1>
                <p className="hero-description">{t.heroSub[slide]}</p>
                <a className="button" href={`${home}${t.heroButtons[slide].path}`}>
                  {t.heroButtons[slide].label}
                  <span>↗</span>
                </a>
              </div>
              <a
                className="hero-scroll"
                href="#production-bases"
                aria-label="Next section"
              >
                ↓
              </a>
              <div className="hero-index">
                0{slide + 1}
                <span>/ 02</span>
              </div>
            </section>
            <section id="production-bases">
              <div className="section-heading container">
                <div>
                  <p className="eyebrow green">{t.basesLabel}</p>
                  <h2>{t.basesTitle}</h2>
                </div>
                <p>{t.basesText}</p>
              </div>
              <div className="base-grid">
                {bases.map((b, i) => (
                  <button
                    className="base-tile"
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                  >
                    {b.image && (
                      <img loading="lazy" src={b.image} alt={b.name} />
                    )}
                    <div className="tile-overlay" />
                    <span className="tile-number">0{i + 1}</span>
                    <span className="tile-label">
                      {b.name}
                      <span>↗</span>
                    </span>
                    <span className="tile-description">{b.desc}</span>
                  </button>
                ))}
              </div>
            </section>
            <section id="about">
              <div className="section-heading container">
                <div>
                  <p className="eyebrow green">{t.brandLabel}</p>
                  <h2>{t.brandTitle}</h2>
                </div>
                <p>{t.brandText}</p>
              </div>
              <div
                className="brand-section"
                style={{ backgroundImage: `url(${image("production.jpg")})` }}
              >
                <div className="brand-panel">
                  <div className="brand-links">
                    {catalog.categories.map((b) => (
                      <button
                        key={b.slug}
                        onClick={() => {
                          window.location.href = categoryUrl(b.slug);
                        }}
                      >
                        {b.name}
                        <span>↗</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="brand-mark">
                  ALEMAX<span>GLOBAL INGREDIENTS</span>
                </div>
              </div>
            </section>
            <section id="products" className="products-section">
              <div className="container">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow green">{t.productsLabel}</p>
                    <h2>{t.productsTitle}</h2>
                  </div>
                  <div className="products-intro">
                    <p>
                      {t.productsText}{" "}
                      <a
                        href={`${home}/products`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        {t.all} ↗
                      </a>
                    </p>
                  </div>
                </div>
                <div className="product-grid">
                  {products.slice(0, 4).map((p) => (
                    <article className="product" key={p.id}>
                      <button
                        className="product-image"
                        onClick={() => setSelected(p.id)}
                        aria-label={`${t.inquire}: ${p.name}`}
                      >
                        <ProductImage
                          src={p.image}
                          alt={p.fields?.image_alt || p.name}
                          locale={locale}
                        />
                        <span>↗</span>
                      </button>
                      <p className="product-code">{p.code}</p>
                      <h3>
                        <button onClick={() => setSelected(p.id)}>
                          {p.name}
                        </button>
                      </h3>
                      <p>{p.summary}</p>
                      <button className="text-link" onClick={() => ask(p.name)}>
                        {t.inquire} ↗
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
            <section id="updates" className="updates-section container">
              <div className="section-heading">
                <div>
                  <p className="eyebrow green">{t.updatesLabel}</p>
                  <h2>{t.updatesTitle}</h2>
                </div>
                <p>{t.updatesText}</p>
              </div>
              <div className="updates-grid">
                {catalog.articles?.length ? (
                  catalog.articles.slice(0, 3).map((article) => (
                    <a
                      href={`${home}/activity/${article.slug}`}
                      className="update"
                      key={article.id}
                    >
                      <ArticleThumbnail article={article} />
                      <h3>
                        {article.fields.title}
                        <span>↗</span>
                      </h3>
                      <p>{article.fields.summary}</p>
                    </a>
                  ))
                ) : (
                  <p>
                    {locale === "en"
                      ? "No updates published yet."
                      : "Aún no hay novedades publicadas."}
                  </p>
                )}
              </div>
            </section>
            <section id="contact" className="contact-section">
              <div className="container">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{t.contactLabel}</p>
                    <h2>{t.contactTitle}</h2>
                  </div>
                  <p>{t.contactText}</p>
                </div>
                <InquiryForm locale={locale} subject={subject} />
              </div>
            </section>
          </>
        )}{" "}
      </main>
      <footer>
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src={image("logo.svg")} alt="ALEMAX Global Ingredients" />
            <p>{t.footer}</p>
          </div>
          <div>
            <h4>{t.business}</h4>
            <a href={`${home}/production-bases`}>{t.nav[0]}</a>
            <a href={`${home}/production-bases`}>{t.nav[1]}</a>
            <a href={`${home}/products`}>{t.nav[2]}</a>
          </div>
          <div>
            <h4>{t.resources}</h4>
            <a href={`${home}/about`}>{t.nav[3]}</a>
            <a href={`${home}/activity`}>{t.nav[4]}</a>
            <a href={`${home}/privacy`}>{t.policy}</a>
            <a id="footer-cookie-policy" href={`${home}/cookie`}>
              {locale === "en" ? "Cookie Policy" : "Política de cookies"}
            </a>
            <a href={`${home}/terms`} target="_blank" rel="noreferrer">
              {locale === "en" ? "Legal Notice" : "Aviso legal"}
            </a>
          </div>
          <div>
            <h4>{t.nav[5]}</h4>
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
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} ALEMAX GLOBAL INGREDIENTS SL</span>
          <a href="#">{t.top} ↑</a>
        </div>
      </footer>
      <dialog
        ref={dialog}
        className="detail-dialog"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setSelected(null);
        }}
      >
        <button
          className="dialog-close"
          aria-label={t.close}
          onClick={() => setSelected(null)}
        >
          ×
        </button>
        {(item || base) && (
          <>
            <img
              className="detail-photo"
              src={(item || base)!.image || undefined}
              alt={item?.name || base?.name || ""}
            />
            <div className="detail-body">
              <p className="eyebrow green">{item?.code || t.basesLabel}</p>
              <h2>{item?.name || base?.name}</h2>
              <p>{item?.summary || base?.desc}</p>
              <p>{t.detail}</p>
              <button
                className="button"
                onClick={() => ask(item?.name || base?.name || "")}
              >
                {t.inquire} ↗
              </button>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={searchDialog}
        className="search-dialog"
        onCancel={() => setSearch(false)}
      >
        <button
          className="dialog-close"
          aria-label={t.close}
          onClick={() => setSearch(false)}
        >
          ×
        </button>
        <h2>{t.search}</h2>
        <label className="search-input">
          <span className="sr-only">{t.search}</span>
          <input
            autoFocus
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="search-results">
          {searchItems.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setSearch(false);
                setSelected(r.id);
              }}
            >
              <span>
                {r.title}
                <small>{r.kind}</small>
              </span>
              <span>↗</span>
            </button>
          ))}
          {!searchItems.length && <p>{t.noResults}</p>}
        </div>
      </dialog>
    </>
  );
}
