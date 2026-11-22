import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const isPublicRead =
      pathname === "/api/products" ||
      /^\/api\/products\/[^/]+$/.test(pathname) ||
      pathname === "/api/search/suggestions" ||
      pathname === "/api/categories";

    if (!isPublicRead) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    if (req.method !== "GET") {
      return NextResponse.json(
        { ok: false, error: "This public preview is read-only." },
        { status: 405, headers: { Allow: "GET" } }
      );
    }
  }

  // Handle password recovery redirect query if present
  const isRecoveryQuery =
    searchParams.get("type") === "recovery" ||
    Boolean(searchParams.get("token") && pathname === "/");

  if (
    isRecoveryQuery &&
    (pathname !== "/login" || searchParams.get("mode") !== "update-password")
  ) {
    const recoveryLoginUrl = new URL("/login", req.url);
    recoveryLoginUrl.searchParams.set("mode", "update-password");
    searchParams.forEach((value, key) => {
      if (key !== "mode") {
        recoveryLoginUrl.searchParams.set(key, value);
      }
    });
    return NextResponse.redirect(recoveryLoginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/",
    "/login",
    "/admin",
    "/admin/:path*",
    "/seller/:path*",
  ],
};
