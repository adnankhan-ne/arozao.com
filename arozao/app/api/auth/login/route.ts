import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { fetchPhpApi } from "@/lib/php-api";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  const rate = checkRateLimit(`login:${getClientIp(request)}:${email}`, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const php = await fetchPhpApi(request, "auth/login", { email, password });
  const result = await php.json();
  if (!php.ok || !result.success || !result.data?.token || !result.data?.user) {
    return NextResponse.json(
      { ok: false, error: result.error || result.message || "Invalid email or password." },
      { status: php.status }
    );
  }

  const record = result.data.user;
  const user = {
    id: String(record.id),
    name: record.full_name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    isEmailVerified: Boolean(record.email_verified_at),
    isPhoneVerified: Boolean(record.phone_verified_at),
    isActive: record.is_active === true || record.is_active === 1 || record.is_active === "1",
  };
  const response = NextResponse.json({ ok: true, user });
  response.cookies.set("arozao-access-token", result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
