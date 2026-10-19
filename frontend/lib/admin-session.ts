import "server-only";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";

const name = "alemax_admin";
export function adminConfigured() {
  return Boolean(
    (process.env.ADMIN_PASSWORD?.length || 0) >= 12 &&
    (process.env.ADMIN_SESSION_SECRET?.length || 0) >= 32 &&
    process.env.INTERNAL_API_KEY,
  );
}
function signature(value: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "")
    .update(
      `${value}:${process.env.ADMIN_USERNAME || "admin"}:${process.env.ADMIN_PASSWORD || ""}`,
    )
    .digest("hex");
}
export function equalSecret(a: string, b: string) {
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(a), hash(b));
}
export async function isAdmin() {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(name)?.value || "";
  const [expires, sig] = value.split(".");
  return (
    /^\d+$/.test(expires || "") &&
    Number(expires) > Date.now() &&
    equalSecret(sig || "", signature(expires))
  );
}
export async function setAdminSession() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set(name, `${expires}.${signature(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function clearAdminSession() {
  (await cookies()).delete(name);
}
