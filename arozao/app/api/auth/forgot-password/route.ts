import { NextRequest, NextResponse } from "next/server";
import { getTrustedSiteOrigin } from "@/lib/email/arozao-email-service";
import { requestPasswordReset } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const targetUrl = new URL("/login", getTrustedSiteOrigin(request.nextUrl.origin));
  targetUrl.searchParams.set("mode", "update-password");
  return NextResponse.redirect(targetUrl);
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`forgot-pw:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many password recovery requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    return NextResponse.json(await requestPasswordReset(email, request.nextUrl.origin));
  } catch (error) {
    console.error("[Password reset] Request failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to process password reset request." },
      { status: 502 }
    );
  }
}
