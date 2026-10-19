import type { SiteCatalog } from "@/lib/catalog-types";
import { type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import ContentBody from "./ContentBody";
import CookiePreferencesButton from "../CookiePreferencesButton";
export default function CookiePage({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: SiteCatalog;
}) {
  const page = catalog.pages.find((p) => p.path === "cookie")!;
  return (
    <>
      <PageHeading locale={locale} title={page.title} />
      <section className="legacy-body container">
        <article className="legacy-prose">
          <h2>
            {locale === "en"
              ? "Cookies currently used on this website"
              : "Cookies utilizadas actualmente en este sitio"}
          </h2>
          <p>
            {locale === "en"
              ? "ALEMAX Global Ingredients SL currently uses no analytics, advertising or personalisation cookies. The following first-party cookies support necessary functions. Use the button below to change or withdraw your optional-cookie choice."
              : "ALEMAX Global Ingredients SL no utiliza actualmente cookies de análisis, publicidad ni personalización. Las siguientes cookies propias permiten funciones necesarias. Utiliza el botón de abajo para cambiar o retirar tu elección sobre cookies opcionales."}
          </p>
          <CookiePreferencesButton locale={locale} />
          <ul>
            <li>
              <strong>alemax_cookie_choice</strong>:{" "}
              {locale === "en"
                ? "remembers your choice and notice version for 180 days; set after Accept or Reject."
                : "recuerda tu elección y la versión del aviso durante 180 días; se establece al aceptar o rechazar."}
            </li>
            <li>
              <strong>alemax_admin</strong>:{" "}
              {locale === "en"
                ? "authenticates administrators for up to eight hours; set only after an administrator signs in."
                : "autentica a los administradores durante un máximo de ocho horas; solo se establece al iniciar sesión en el panel."}
            </li>
          </ul>
          <p>
            {locale === "en"
              ? "When enabled, Cloudflare Turnstile is loaded after you interact with the inquiry form to protect submissions from abuse. This security service is separate from optional analytics or advertising."
              : "Cuando está habilitado, Cloudflare Turnstile se carga al interactuar con el formulario de consulta para proteger los envíos frente a abusos. Este servicio de seguridad es independiente del análisis o la publicidad opcionales."}{" "}
            <a href="https://www.cloudflare.com/privacypolicy/">
              Cloudflare Privacy Policy
            </a>
            .
          </p>
        </article>
        <ContentBody page={page}></ContentBody>
      </section>
    </>
  );
}
