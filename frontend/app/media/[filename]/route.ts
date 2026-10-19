import { internalApi } from "@/lib/internal-api";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(filename))
    return new Response(null, { status: 404 });
  try {
    const response = await internalApi(`/cms/media/${filename}`);
    if (!response.ok) return new Response(null, { status: response.status });
    return new Response(response.body, {
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
