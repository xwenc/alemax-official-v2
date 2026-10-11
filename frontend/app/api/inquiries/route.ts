import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  let validOrigin = false;
  try {
    validOrigin =
      new URL(request.headers.get("origin") || "").host ===
      request.headers.get("host");
  } catch {}
  if (!validOrigin)
    return NextResponse.json({ detail: "Invalid origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 20000)
    return NextResponse.json({ detail: "Request too large." }, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 20000)
      return NextResponse.json(
        { detail: "Request too large." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    const response = await fetch(
      `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/api/inquiries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      },
    );
    return NextResponse.json(await response.json(), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to send your inquiry. Please try again shortly." },
      { status: 503 },
    );
  }
}
