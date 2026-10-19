import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function madridDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function dailyVisitorHash(
  raw: string | null,
  day: string,
  secret: string,
): string | null {
  if (!raw || secret.length < 32 || !isIP(raw.trim())) return null;
  let ip = raw.trim().toLowerCase();
  if (ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
  // URL normalizes equivalent compressed/expanded IPv6 forms.
  if (isIP(ip) === 6) ip = new URL(`http://[${ip}]/`).hostname;
  return createHmac("sha256", secret)
    .update(`alemax-daily-visit:${day}:${ip}`)
    .digest("hex");
}
