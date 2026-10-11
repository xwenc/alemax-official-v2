"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { copy, Locale } from "@/lib/content";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export default function InquiryForm({
  locale,
  subject,
}: {
  locale: Locale;
  subject: string;
}) {
  const t = copy[locale];
  const [values, setValues] = useState({
    region: "",
    company: "",
    name: "",
    subject: "",
    email: "",
    message: "",
    website: "",
  });
  const [privacy, setPrivacy] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
      "idle",
    );
  const [siteKey, setSiteKey] = useState<string | null>(null),
    [token, setToken] = useState("");
  const captcha = useRef<HTMLDivElement>(null),
    widget = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (subject) setValues((v) => ({ ...v, subject }));
  }, [subject]);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setSiteKey(d.captchaSiteKey))
      .catch(() => setSiteKey(null));
  }, []);
  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    const mount = () => {
      if (active && captcha.current && window.turnstile)
        widget.current = window.turnstile.render(captcha.current, {
          sitekey: siteKey,
          action: "inquiry",
          callback: (v: string) => setToken(v),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
    };
    let script = document.getElementById(
      "turnstile-script",
    ) as HTMLScriptElement | null;
    if (window.turnstile) mount();
    else {
      if (!script) {
        script = document.createElement("script");
        script.id = "turnstile-script";
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      active = false;
      script?.removeEventListener("load", mount);
      if (widget.current) window.turnstile?.remove(widget.current);
    };
  }, [siteKey]);
  const validate = (key: string, value: string) =>
    !value.trim()
      ? t.required
      : key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? t.emailError
        : "";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const next: Record<string, string> = {};
    for (const key of [
      "region",
      "company",
      "name",
      "subject",
      "email",
      "message",
    ] as const) {
      const error = validate(key, values[key]);
      if (error) next[key] = error;
    }
    if (!privacy) next.privacy = t.privacyError;
    if (siteKey && !token) next.captcha = t.verifyError;
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setStatus("sending");
    try {
      const r = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          privacy,
          locale,
          captcha_token: token,
        }),
      });
      if (!r.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      if (widget.current) window.turnstile?.reset(widget.current);
      setToken("");
    }
  }
  const field = (
    key: "company" | "name" | "subject" | "email",
    index: number,
    max: number,
  ) => (
    <div>
      <label
        className={`form-field ${errors[key] ? "invalid" : ""}`}
        htmlFor={key}
      >
        <span>{t.fields[index]} *</span>
        <input
          id={key}
          name={key}
          type={key === "email" ? "email" : "text"}
          autoComplete={
            key === "company"
              ? "organization"
              : key === "name"
                ? "name"
                : key === "email"
                  ? "email"
                  : "off"
          }
          maxLength={max}
          required
          value={values[key]}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-error` : undefined}
          onChange={(e) => {
            setValues({ ...values, [key]: e.target.value });
            if (errors[key]) setErrors({ ...errors, [key]: "" });
          }}
          onBlur={() =>
            setErrors((v) => ({ ...v, [key]: validate(key, values[key]) }))
          }
        />
      </label>
      {errors[key] && (
        <p className="field-error" id={`${key}-error`}>
          {errors[key]}
        </p>
      )}
    </div>
  );
  return (
    <form onSubmit={submit} noValidate className="inquiry-form">
      <div className="form-columns">
        <div className="field-stack">
          <div>
            <label
              htmlFor="region"
              className={`form-field ${errors.region ? "invalid" : ""}`}
            >
              <span>{t.fields[0]} *</span>
              <select
                id="region"
                required
                value={values.region}
                aria-invalid={!!errors.region}
                aria-describedby={errors.region ? "region-error" : undefined}
                onChange={(e) => {
                  setValues({ ...values, region: e.target.value });
                  setErrors({ ...errors, region: "" });
                }}
              >
                <option value="">{t.choose}</option>
                <option value="EMEA">
                  EMEA — Europe / Middle East / Africa
                </option>
                <option value="AMER">AMER — Americas</option>
                <option value="APAC">APAC — Asia Pacific</option>
              </select>
            </label>
            {errors.region && (
              <p id="region-error" className="field-error">
                {errors.region}
              </p>
            )}
          </div>
          {field("company", 1, 160)}
          {field("name", 2, 120)}
          {field("subject", 3, 200)}
          {field("email", 4, 254)}
        </div>
        <div>
          <label
            className={`form-field message-field ${errors.message ? "invalid" : ""}`}
            htmlFor="message"
          >
            <span>{t.fields[5]} *</span>
            <textarea
              id="message"
              maxLength={5000}
              required
              value={values.message}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
              onChange={(e) =>
                setValues({ ...values, message: e.target.value })
              }
              onBlur={() =>
                setErrors((v) => ({
                  ...v,
                  message: validate("message", values.message),
                }))
              }
            />
          </label>
          {errors.message && (
            <p id="message-error" className="field-error">
              {errors.message}
            </p>
          )}
          <div className="verification">
            <span>{t.verification}</span>
            <div ref={captcha} />
            {siteKey === "" && <small>{t.development}</small>}
            {siteKey === null && (
              <small>
                {locale === "en"
                  ? "Loading verification configuration…"
                  : "Cargando configuración…"}
              </small>
            )}
            {errors.captcha && <p className="field-error">{errors.captcha}</p>}
          </div>
        </div>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => setValues({ ...values, website: e.target.value })}
          />
        </label>
      </div>
      <div className="form-bottom">
        <div>
          <label className="privacy-check">
            <input
              id="privacy"
              type="checkbox"
              required
              checked={privacy}
              onChange={(e) => {
                setPrivacy(e.target.checked);
                setErrors({ ...errors, privacy: "" });
              }}
              aria-describedby={errors.privacy ? "privacy-error" : undefined}
            />
            <span>
              {t.privacy}{" "}
              <a
                href={
                  locale === "es"
                    ? "https://www.alemaxglobal.com/es/privacy"
                    : "/privacy"
                }
                target="_blank"
                rel="noreferrer"
              >
                {t.policy}
              </a>
              . *
            </span>
          </label>
          {errors.privacy && (
            <p className="field-error" id="privacy-error">
              {errors.privacy}
            </p>
          )}
        </div>
        <button
          className="button submit-button"
          disabled={status === "sending" || siteKey === null}
        >
          {status === "sending" ? t.sending : t.send}
          <span>↗</span>
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={`form-status ${status === "error" ? "error" : ""}`}
      >
        {status === "success" ? t.success : status === "error" ? t.error : ""}
      </p>
    </form>
  );
}
