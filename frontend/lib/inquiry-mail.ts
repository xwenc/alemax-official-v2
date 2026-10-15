import nodemailer from "nodemailer";
import { createHash } from "node:crypto";

export type Inquiry = {
  region: string;
  company: string;
  name: string;
  subject: string;
  email: string;
  message: string;
  locale: "en" | "es";
  privacy: true;
  captcha_token: string;
  website: string;
};
export type SubmissionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        "invalid" | "forbidden" | "rate_limit" | "verification" | "unavailable";
    };
type Env = Record<string, string | undefined>;
type MailSender = {
  sendMail: (
    mail: ReturnType<typeof inquiryMessage>,
  ) => Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
};
export class InquiryLimiter {
  private recent = new Map<string, number[]>();
  accept(email: string, now = Date.now()) {
    for (const [key, times] of this.recent) {
      const active = times.filter((time) => now - time < 600_000);
      if (active.length) this.recent.set(key, active);
      else this.recent.delete(key);
    }
    const key = createHash("sha256").update(email.toLowerCase()).digest("hex");
    const times = this.recent.get(key) || [];
    if (times.length >= 5 || (!times.length && this.recent.size >= 10_000))
      return false;
    this.recent.set(key, [...times, now]);
    return true;
  }
}
const limiter = new InquiryLimiter();
const mailbox = (value: string) =>
  /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(value);
export function parseInquiry(input: unknown): Inquiry | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const v = input as Record<string, unknown>;
  const limits: Record<string, number> = {
    company: 160,
    name: 120,
    subject: 200,
    email: 254,
    message: 5000,
  };
  const fields: Record<string, string> = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof v[key] !== "string") return null;
    const value = (v[key] as string).trim();
    if (
      !value ||
      value.length > max ||
      (key !== "message" && /[\r\n\u0000]/.test(value))
    )
      return null;
    fields[key] = value;
  }
  if (
    !mailbox(fields.email) ||
    !["EMEA", "AMER", "APAC"].includes(String(v.region)) ||
    !["en", "es"].includes(String(v.locale)) ||
    v.privacy !== true
  )
    return null;
  if (
    (v.website !== undefined && v.website !== "") ||
    (v.captcha_token !== undefined &&
      (typeof v.captcha_token !== "string" || v.captcha_token.length > 4096))
  )
    return null;
  return {
    ...fields,
    region: v.region,
    locale: v.locale,
    privacy: true,
    captcha_token: v.captcha_token || "",
    website: "",
  } as Inquiry;
}
export function smtpConfiguration(env: Env) {
  const host = env.SMTP_HOST?.trim(),
    user = env.SMTP_USER,
    pass = env.SMTP_PASSWORD;
  const from = env.SMTP_FROM?.trim(),
    to = env.INQUIRY_TO?.trim() || "info@alemaxglobal.com";
  const port = Number(env.SMTP_PORT || 587);
  if (
    !host ||
    !user ||
    !pass ||
    !from ||
    !mailbox(from) ||
    !mailbox(to) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw new Error("SMTP configuration unavailable");
  const secure = port === 465;
  return {
    from,
    to,
    options: {
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
      tls: { minVersion: "TLSv1.2" as const },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    },
  };
}
export function inquiryMessage(
  inquiry: Inquiry,
  config: { from: string; to: string },
) {
  return {
    from: { name: "ALEMAX website", address: config.from },
    to: config.to,
    replyTo: { name: inquiry.name, address: inquiry.email },
    subject: `[ALEMAX inquiry] ${inquiry.subject}`,
    text: [
      `New website inquiry`,
      `Company: ${inquiry.company}`,
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Region: ${inquiry.region}`,
      `Language: ${inquiry.locale}`,
      `Subject: ${inquiry.subject}`,
      `Privacy consent: accepted`,
      ``,
      `Message:`,
      inquiry.message,
    ].join("\n"),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
export async function processInquiry(
  input: unknown,
  context: {
    origin: string | null;
    host: string | null;
    fetchSite: string | null;
  },
  deps: {
    env?: Env;
    fetch?: typeof fetch;
    limiter?: InquiryLimiter;
    createTransport?: (
      options: ReturnType<typeof smtpConfiguration>["options"],
    ) => MailSender;
  } = {},
): Promise<SubmissionResult> {
  const env = deps.env || process.env;
  let origin: URL;
  try {
    origin = new URL(context.origin || "");
    const allowed = (env.SITE_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      (allowed.length
        ? !allowed.includes(origin.origin)
        : origin.host !== context.host) ||
      (context.fetchSite && context.fetchSite !== "same-origin")
    )
      return { ok: false, error: "forbidden" };
  } catch {
    return { ok: false, error: "forbidden" };
  }
  const inquiry = parseInquiry(input);
  if (!inquiry) return { ok: false, error: "invalid" };
  let config: ReturnType<typeof smtpConfiguration>;
  try {
    config = smtpConfiguration(env);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  if (!(deps.limiter || limiter).accept(inquiry.email))
    return { ok: false, error: "rate_limit" };
  const secret = env.CAPTCHA_SECRET_KEY;
  if (secret) {
    if (!inquiry.captcha_token) return { ok: false, error: "verification" };
    try {
      const response = await (deps.fetch || fetch)(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret,
            response: inquiry.captcha_token,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) return { ok: false, error: "verification" };
      const result = await response.json();
      if (
        !result.success ||
        result.action !== "inquiry" ||
        result.hostname !== origin.hostname
      )
        return { ok: false, error: "verification" };
    } catch {
      return { ok: false, error: "verification" };
    }
  } else if (env.ENVIRONMENT !== "development")
    return { ok: false, error: "verification" };
  try {
    const transport = deps.createTransport
      ? deps.createTransport(config.options)
      : nodemailer.createTransport(config.options);
    const result = await transport.sendMail(inquiryMessage(inquiry, config));
    if (!result.accepted?.length || result.rejected?.length)
      return { ok: false, error: "unavailable" };
    return { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
