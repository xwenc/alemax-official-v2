"use client";
import { useEffect, useRef, useState } from "react";
import { bases, copy, Locale, products } from "@/lib/content";
import InquiryForm from "./InquiryForm";
const image = (file: string) => `/images/${file}`;
const links = [
  "about",
  "production-bases",
  "products",
  "about",
  "updates",
  "contact",
];
export default function Website() {
  const [locale, setLocale] = useState<Locale>("en"),
    [slide, setSlide] = useState(0),
    [compact, setCompact] = useState(false),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [subject, setSubject] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    searchDialog = useRef<HTMLDialogElement>(null);
  const t = copy[locale];
  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "es") setLocale("es");
    const scroll = () => setCompact(window.scrollY > 80);
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
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (search) searchDialog.current?.showModal();
    else searchDialog.current?.close();
  }, [search]);
  const switchLanguage = (lang: Locale) => {
    setLocale(lang);
    const u = new URL(window.location.href);
    u.searchParams.set("lang", lang);
    window.history.replaceState(null, "", u);
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
    ...products.map((p) => ({ id: p.id, title: p.name, kind: p.code })),
    ...bases.map((b) => ({ id: b.id, title: b[locale], kind: t.nav[1] })),
  ].filter((p) =>
    `${p.title} ${p.kind}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {locale === "en" ? "Skip to content" : "Ir al contenido"}
      </a>
      <header className={`site-header ${compact ? "compact" : ""}`}>
        <a className="logo" href="#" aria-label="ALEMAX home">
          <img src={image("logo.png")} alt="ALEMAX Global Ingredients" />
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
                <a href={`#${links[i]}`} onClick={() => setMenu(false)}>
                  {label}
                  {i === 1 || i === 2 ? (
                    <span className="chevron">⌄</span>
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
                        {b[locale]}
                      </button>
                    ))}
                  </div>
                )}
                {i === 2 && (
                  <div className="submenu">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelected(p.id);
                          setMenu(false);
                        }}
                      >
                        {p.name}
                      </button>
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
        <section
          className="hero"
          aria-label={
            locale === "en" ? "Company introduction" : "Presentación de empresa"
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
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.hero[slide]}</h1>
            <p className="hero-description">{t.heroSub}</p>
            <a className="button" href="#products">
              {t.explore}
              <span>↗</span>
            </a>
          </div>
          <a className="hero-scroll" href="#about" aria-label="Next section">
            ↓
          </a>
          <div className="hero-index">
            0{slide + 1}
            <span>/ 02</span>
          </div>
        </section>
        <section
          id="about"
          className="about-section photo-panel"
          style={{ backgroundImage: `url(${image("equipment.jpg")})` }}
        >
          <div className="wash" />
          <div className="about-panel">
            <p className="eyebrow">ALEMAX GLOBAL INGREDIENTS</p>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutText}</p>
            <a className="button" href="#production-bases">
              {t.aboutCta}
              <span>↗</span>
            </a>
          </div>
          <div className="about-note">
            <span>01 /</span>
            <p>
              {locale === "en"
                ? "From production to partnership."
                : "De la producción a la colaboración."}
            </p>
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
                <img loading="lazy" src={image(b.image)} alt={b[locale]} />
                <div className="tile-overlay" />
                <span className="tile-number">0{i + 1}</span>
                <span className="tile-label">
                  {b[locale]}
                  <span>↗</span>
                </span>
                <span className="tile-description">{b.desc}</span>
              </button>
            ))}
          </div>
        </section>
        <section
          className="brand-section"
          style={{ backgroundImage: `url(${image("production.jpg")})` }}
        >
          <div className="brand-panel">
            <p className="eyebrow">{t.brandLabel}</p>
            <h2>{t.brandTitle}</h2>
            <p>{t.brandText}</p>
            <div className="brand-links">
              {bases.slice(0, 4).map((b) => (
                <button key={b.id} onClick={() => setSelected(b.id)}>
                  {b[locale]}
                  <span>↗</span>
                </button>
              ))}
            </div>
          </div>
          <div className="brand-mark">
            ALEMAX<span>GLOBAL INGREDIENTS</span>
          </div>
        </section>
        <section id="products" className="products-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow green">{t.productsLabel}</p>
                <h2>{t.productsTitle}</h2>
              </div>
              <a
                href={
                  locale === "es"
                    ? "https://www.alemaxglobal.com/es/products"
                    : "https://www.alemaxglobal.com/en/products"
                }
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                {t.all} ↗
              </a>
            </div>
            <div
              className="product-filters"
              role="group"
              aria-label="Product categories"
            >
              {["all", "potassium", "hydrocolloids"].map((f) => (
                <button
                  aria-pressed={filter === f}
                  className={filter === f ? "selected" : ""}
                  key={f}
                  onClick={() => setFilter(f)}
                >
                  {f === "all"
                    ? t.filter
                    : bases.find((b) => b.id === f)?.[locale]}
                </button>
              ))}
            </div>
            <div className="product-grid">
              {products
                .filter((p) => filter === "all" || p.category === filter)
                .map((p) => (
                  <article className="product" key={p.id}>
                    <button
                      className="product-image"
                      onClick={() => setSelected(p.id)}
                      aria-label={`${t.inquire}: ${p.name}`}
                    >
                      <img src={image(p.image)} alt={p.name} loading="lazy" />
                      <span>↗</span>
                    </button>
                    <p className="product-code">{p.code}</p>
                    <h3>
                      <button onClick={() => setSelected(p.id)}>
                        {p.name}
                      </button>
                    </h3>
                    <p>{p[locale]}</p>
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
            {["plant.jpg", "hydrocolloids.png", "equipment.jpg"].map(
              (file, i) => (
                <a
                  href={`#${["production-bases", "products", "contact"][i]}`}
                  className="update"
                  key={file}
                >
                  <div className="update-image">
                    <img src={image(file)} loading="lazy" alt="" />
                  </div>
                  <p className="eyebrow green">
                    {["ALEMAX", t.nav[2], t.nav[5]][i]}
                  </p>
                  <h3>
                    {t.cards[i]}
                    <span>↗</span>
                  </h3>
                  <p>{t.cardDescs[i]}</p>
                </a>
              ),
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
      </main>
      <footer>
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src={image("logo.png")} alt="ALEMAX Global Ingredients" />
            <p>{t.footer}</p>
          </div>
          <div>
            <h4>{t.business}</h4>
            <a href="#about">{t.nav[0]}</a>
            <a href="#production-bases">{t.nav[1]}</a>
            <a href="#products">{t.nav[2]}</a>
          </div>
          <div>
            <h4>{t.resources}</h4>
            <a href="#updates">{t.nav[4]}</a>
            <a href="/privacy">{t.policy}</a>
            <a
              href="https://www.alemaxglobal.com/es/terms"
              target="_blank"
              rel="noreferrer"
            >
              {locale === "en" ? "Legal notice" : "Aviso legal"}
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
              src={image((item || base)!.image)}
              alt={item?.name || base?.[locale] || ""}
            />
            <div className="detail-body">
              <p className="eyebrow green">{item?.code || t.basesLabel}</p>
              <h2>{item?.name || base?.[locale]}</h2>
              <p>{item?.[locale] || base?.desc}</p>
              <p>{t.detail}</p>
              <button
                className="button"
                onClick={() => ask(item?.name || base?.[locale] || "")}
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
