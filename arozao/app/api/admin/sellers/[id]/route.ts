import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const response = await fetchPhpApi(req, `admin/sellers/${encodeURIComponent(id)}`);
  const result = await response.json();
  if (!response.ok || !result.success) {
    return NextResponse.json(
      { ok: false, error: result.message || "Failed to load seller application." },
      { status: response.status }
    );
  }
  return NextResponse.json({
    ok: true,
    application: result.data,
    businessProfile: null,
    payoutMethods: [],
    documents: result.data?.documents || [],
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }
  const actions: Record<string, string> = {
    Approved: "approve",
    Rejected: "reject",
    Suspended: "suspend",
  };
  const action = actions[String(body.status || "")];
  if (!action) {
    return NextResponse.json(
      { ok: false, error: "The PHP backend supports Approved, Rejected, and Suspended seller statuses." },
      { status: 422 }
    );
  }

  const phpBody =
    action === "reject" || action === "suspend"
      ? { reason: body.rejectionReason || body.actionRequiredNote || body.reviewerNotes || "" }
      : {};
  const response = await fetchPhpApi(req, `admin/sellers/${encodeURIComponent(id)}/${action}`, phpBody);
  const result = await response.json();
  if (!response.ok || !result.success) {
    return NextResponse.json(
      { ok: false, error: result.message || "Failed to update seller application." },
      { status: response.status }
    );
  }
  return NextResponse.json({ ok: true, application: result.data || null });
}
