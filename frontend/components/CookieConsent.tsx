"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/content";
import {
  consentCookie,
  readConsentCookie,
  type CookieChoice,
} from "@/lib/cookie-consent";

const copy = {
  en: {
    title: "We value your privacy.",
    text: "ALEMAX Global Ingredients SL uses essential cookies to keep this website secure and remember your privacy choice. We do not currently use analytics, advertising or personalisation cookies. Optional cookies require your prior consent. We also measure daily visits on our server without analytics cookies; details are in our Privacy Policy.",
    more: "For more information, see our",
    privacy: "Privacy Policy",
    and: "and",
    cookies: "Cookie Policy",
    note: "Accept and Reject record your choice for optional cookies for 180 days. Essential functionality remains available with either choice. You can change or withdraw your choice at any time on the Cookie Policy page.",
    reject: "Reject",
    accept: "Accept",
    settings: "Cookie settings",
    saved: "Cookie choice saved.",
  },
  es: {
    title: "Valoramos tu privacidad.",
    text: "ALEMAX Global Ingredients SL utiliza cookies necesarias para proteger este sitio y recordar tu elección de privacidad. Actualmente no utilizamos cookies de análisis, publicidad ni personalización. Las cookies opcionales requieren tu consentimiento previo. También medimos las visitas diarias en el servidor sin cookies de análisis; consulta nuestra Política de privacidad.",
    more: "Para más información, consulta nuestra",
    privacy: "Política de privacidad",
    and: "y",
    cookies: "Política de cookies",
    note: "Aceptar y Rechazar guardan tu elección sobre cookies opcionales durante 180 días. Las funciones necesarias siguen disponibles con ambas opciones. Puedes cambiar o retirar tu elección en cualquier momento en la página Política de cookies.",
    reject: "Rechazar",
    accept: "Aceptar",
    settings: "Configuración de cookies",
    saved: "Preferencia de cookies guardada.",
  },
};
export default function CookieConsent({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [choice, setChoice] = useState<CookieChoice | null>(null);
  const [loaded, setLoaded] = useState(false);
  const settings = useRef<HTMLButtonElement>(null);
  const reject = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const stored = readConsentCookie(document.cookie);
    setChoice(stored?.choice || null);
    setOpen(!stored);
    setLoaded(true);
    const reopen = () => {
      setOpen(true);
      setSaved(false);
      requestAnimationFrame(() =>
        reject.current?.focus({ preventScroll: true }),
      );
    };
    window.addEventListener("alemax:open-cookie-settings", reopen);
    return () =>
      window.removeEventListener("alemax:open-cookie-settings", reopen);
  }, []);
  const choose = (choice: CookieChoice) => {
    document.cookie = consentCookie(choice, location.protocol === "https:");
    window.dispatchEvent(
      new CustomEvent("alemax:cookie-consent", {
        detail: readConsentCookie(document.cookie),
      }),
    );
    setChoice(choice);
    setOpen(false);
    setSaved(true);
    requestAnimationFrame(() => {
      const target =
        choice === "accepted"
          ? document.getElementById("footer-cookie-policy")
          : settings.current;
      target?.focus({ preventScroll: true });
    });
  };
  return (
    <>
      <button
        hidden={!loaded || choice === "accepted"}
        className="cookie-settings"
        ref={settings}
        aria-controls="cookie-consent-panel"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          setSaved(false);
          requestAnimationFrame(() =>
            reject.current?.focus({ preventScroll: true }),
          );
        }}
      >
        {t.settings}
      </button>
      <span className="sr-only" role="status">
        {saved ? t.saved : ""}
      </span>
      {open && (
        <section
          id="cookie-consent-panel"
          className="cookie-consent"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-text"
        >
          <h2 id="cookie-consent-title">{t.title}</h2>
          <p id="cookie-consent-text">{t.text}</p>
          <p>
            {t.more} <a href={`/${locale}/privacy`}>{t.privacy}</a> {t.and}{" "}
            <a href={`/${locale}/cookie`}>{t.cookies}</a>.
          </p>
          <p className="cookie-consent-note">{t.note}</p>
          <div className="cookie-consent-actions">
            <button
              className="cookie-reject"
              ref={reject}
              onClick={() => choose("rejected")}
            >
              {t.reject}
            </button>
            <button onClick={() => choose("accepted")}>{t.accept}</button>
          </div>
        </section>
      )}
    </>
  );
}
