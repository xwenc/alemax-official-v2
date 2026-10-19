import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-site-locale",
    request.nextUrl.pathname.split("/")[1] === "es" ? "es" : "en",
  );
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|images|media|favicon.ico).*)"],
};
