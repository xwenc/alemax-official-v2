import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    captchaSiteKey: process.env.CAPTCHA_SITE_KEY || "",
  });
}
