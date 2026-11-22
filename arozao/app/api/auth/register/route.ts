import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { fetchPhpApi } from "@/lib/php-api";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`register:${getClientIp(request)}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!name || !email || !password) {
    return NextResponse.json(
      { ok: false, error: "Full name, email, and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters long." }, { status: 422 });
  }

  const php = await fetchPhpApi(request, "auth/register", {
    full_name: name,
    email,
    phone: phone || null,
    password,
    password_confirmation: password,
  });
  const result = await php.json();
  if (!php.ok || !result.success || !result.data?.token || !result.data?.user) {
    return NextResponse.json(
      { ok: false, error: result.error || result.message || "Registration failed." },
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
  };
  const response = NextResponse.json({ ok: true, user, requiresEmailConfirmation: false });
  response.cookies.set("arozao-access-token", result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
