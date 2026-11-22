import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export async function POST(request: NextRequest) {
  const php = await fetchPhpApi(request, "auth/logout");
  if (!php.ok) {
    console.error("[Arozao auth] PHP logout endpoint failed:", php.status);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("arozao-access-token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  response.cookies.delete("arozao-user-role");
  return response;
}
