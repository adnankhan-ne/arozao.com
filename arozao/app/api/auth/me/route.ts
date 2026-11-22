import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function mapProfile(record: Record<string, unknown>) {
  return {
    id: String(record.id),
    name: record.full_name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    isEmailVerified: Boolean(record.email_verified_at),
    isPhoneVerified: Boolean(record.phone_verified_at),
    isActive: toBoolean(record.is_active),
  };
}

export async function GET(request: NextRequest) {
  const php = await fetchPhpApi(request, "auth/me");
  const result = await php.json();
  if (!php.ok || !result.success || !result.data) {
    return NextResponse.json(
      { ok: false, error: result.error || result.message || "Not authenticated." },
      { status: php.status }
    );
  }
  const profile = result.data;
  return NextResponse.json({
    ok: true,
    user: mapProfile(profile),
    profile: {
      full_name: profile.full_name,
      gender: profile.gender,
      date_of_birth: profile.date_of_birth,
      preferred_language: profile.preferred_language,
      newsletter_subscribed: toBoolean(profile.newsletter_subscribed),
    },
  });
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }
  const mapped = {
    full_name: body.fullName,
    phone: body.phone,
    gender: body.gender,
    date_of_birth: body.dateOfBirth,
    preferred_language: body.preferredLanguage,
    newsletter_subscribed: body.newsletterSubscribed,
  };
  const payload = Object.fromEntries(
    Object.entries(mapped).filter(([, value]) => value !== undefined)
  );
  const php = await fetchPhpApi(request, "auth/me", payload);
  const result = await php.json();
  if (!php.ok || !result.success || !result.data) {
    return NextResponse.json(
      { ok: false, error: result.error || result.message || "Failed to update profile." },
      { status: php.status }
    );
  }
  return NextResponse.json({
    ok: true,
    user: mapProfile(result.data),
    profile: {
      full_name: result.data.full_name,
      gender: result.data.gender,
      date_of_birth: result.data.date_of_birth,
      preferred_language: result.data.preferred_language,
      newsletter_subscribed: toBoolean(result.data.newsletter_subscribed),
    },
  });
}
