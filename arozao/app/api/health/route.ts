import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = await fetchPhpApi(request, "health");
  let result: { success?: boolean; message?: string; data?: unknown };
  try {
    result = await response.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "The PHP backend returned an invalid health response." },
      { status: 502 }
    );
  }
  if (!response.ok || !result.success) {
    return NextResponse.json(
      { ok: false, error: result.message || "PHP backend health check failed." },
      { status: response.status }
    );
  }
  return NextResponse.json({ ok: true, ...(result.data as object) });
}
