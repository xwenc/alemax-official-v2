"use server";
import { redirect } from "next/navigation";
import {
  adminConfigured,
  clearAdminSession,
  equalSecret,
  setAdminSession,
} from "@/lib/admin-session";
// Single-admin login has a bounded process-wide attempt window; no untrusted proxy headers.
const attempts: number[] = [];
export async function login(form: FormData) {
  if (!adminConfigured()) redirect("/admin?error=configuration");
  const now = Date.now();
  while (attempts.length && attempts[0] < now - 60_000) attempts.shift();
  if (attempts.length >= 10) redirect("/admin?error=rate");
  attempts.push(now);
  const username = String(form.get("username") || "");
  const password = String(form.get("password") || "");
  if (
    !equalSecret(username, process.env.ADMIN_USERNAME || "admin") ||
    !equalSecret(password, process.env.ADMIN_PASSWORD || "")
  )
    redirect("/admin?error=credentials");
  await setAdminSession();
  redirect("/admin/overview");
}
export async function logout() {
  await clearAdminSession();
  redirect("/admin");
}
