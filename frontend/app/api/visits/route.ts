import { NextRequest, NextResponse } from "next/server";
import { internalApi } from "@/lib/internal-api";
import { dailyVisitorHash, madridDay } from "@/lib/visit-stats";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const enabled =
    process.env.VISIT_STATS_ENABLED === "true" ||
    (process.env.NODE_ENV === "development" &&
      process.env.VISIT_STATS_ENABLED !== "false");
  if (!enabled) return new NextResponse(null, { status: 204 });
  const origins = new Set([
    request.nextUrl.origin,
    ...(process.env.SITE_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]);
  if (!origins.has(request.headers.get("origin") || ""))
    return new NextResponse(null, { status: 403 });
  // Set/overwrite this header in the trusted ingress. Never trust arbitrary X-Forwarded-For.
  const ip =
    request.headers.get("x-alemax-client-ip") ||
    (process.env.NODE_ENV === "development" ? "127.0.0.1" : null);
  const day = madridDay();
  const hash = dailyVisitorHash(
    ip,
    day,
    process.env.VISIT_HASH_SECRET || process.env.INTERNAL_API_KEY || "",
  );
  if (!hash) return new NextResponse(null, { status: 204 });
  try {
    await internalApi("/cms/analytics/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, visitor_hash: hash }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* Statistics must never interrupt public pages. */
  }
  return new NextResponse(null, { status: 204 });
}
