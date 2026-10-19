import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { internalApi } from "@/lib/internal-api";
export const runtime = "nodejs";
const allowed =
  /^(content(?:\/[a-f0-9-]{36}(?:\/(?:spanish|translate|review|publish|unpublish))?)?|media)$/;
async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!(await isAdmin()))
    return NextResponse.json(
      { detail: "Sign in to continue" },
      { status: 401 },
    );
  const path = (await params).path.join("/");
  if (!allowed.test(path)) return new NextResponse(null, { status: 404 });
  if (request.method !== "GET") {
    const origins = new Set([
      request.nextUrl.origin,
      ...(process.env.SITE_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ]);
    if (!origins.has(request.headers.get("origin") || ""))
      return NextResponse.json(
        { detail: "Invalid request origin" },
        { status: 403 },
      );
  }
  try {
    const limit = path === "media" ? 10 * 1024 * 1024 : 4 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > limit)
      return NextResponse.json(
        { detail: "Upload is too large" },
        { status: 413 },
      );
    let body: ArrayBuffer | undefined;
    if (request.method !== "GET") {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) {
            await reader.cancel();
            return NextResponse.json(
              { detail: "Upload is too large" },
              { status: 413 },
            );
          }
          chunks.push(value);
        }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      body = bytes.buffer;
    }
    const result = await internalApi(`/cms/${path}`, {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") || "application/json",
      },
      body,
    });
    return new NextResponse(await result.text(), {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "Content service unavailable. Check the API connection." },
      { status: 503 },
    );
  }
}
export { handle as GET, handle as POST, handle as PUT };
