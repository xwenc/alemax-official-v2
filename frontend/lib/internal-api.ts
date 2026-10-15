import "server-only";
// Reserved for server-side business functions. Public inquiries use SMTP instead.
export async function internalApi(path: string, init: RequestInit = {}) {
  const base = process.env.API_INTERNAL_URL;
  const key = process.env.INTERNAL_API_KEY;
  if (!base || !key) throw new Error("Internal API not configured");
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))
    throw new Error("Invalid internal API path");
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin)
    throw new Error("Invalid internal API origin");
  const headers = new Headers(init.headers);
  headers.set("X-Internal-Key", key);
  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    redirect: "error",
    signal: init.signal || AbortSignal.timeout(15_000),
  });
}
