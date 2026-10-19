export const CONSENT_COOKIE = "alemax_cookie_choice";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;
export type CookieChoice = "accepted" | "rejected";
export type CookieConsent = {
  version: number;
  choice: CookieChoice;
  timestamp: number;
};

export function parseConsent(
  value: string | undefined,
  now = Date.now(),
): CookieConsent | null {
  try {
    const consent = JSON.parse(decodeURIComponent(value || ""));
    if (
      consent.version !== CONSENT_VERSION ||
      !["accepted", "rejected"].includes(consent.choice) ||
      !Number.isFinite(consent.timestamp) ||
      consent.timestamp > now ||
      now - consent.timestamp >= CONSENT_MAX_AGE * 1000
    )
      return null;
    return consent;
  } catch {
    return null;
  }
}
export function readConsentCookie(cookies: string, now = Date.now()) {
  const value = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  return parseConsent(value, now);
}
export function consentCookie(
  choice: CookieChoice,
  secure: boolean,
  now = Date.now(),
) {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    choice,
    timestamp: now,
  };
  return `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
