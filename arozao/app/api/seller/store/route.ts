import { NextRequest, NextResponse } from "next/server";
import { fetchPhpApi } from "@/lib/php-api";

export const dynamic = "force-dynamic";

type PhpEnvelope = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  const response = await fetchPhpApi(request, "seller/store");
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to load store profile." },
      { status: response.status || 502 }
    );
  }

  const seller = asRecord(payload.data);
  return NextResponse.json({
    ok: true,
    store: {
      seller_code: `SEL-${String(seller.id ?? "")}`,
      store_name: stringValue(seller.store_name),
      store_slug: stringValue(seller.slug),
      store_description: stringValue(seller.bio),
      vacation_mode: Boolean(Number(seller.is_on_vacation)),
      rating: null,
      is_verified_merchant: stringValue(seller.status).toLowerCase() === "approved",
      status: stringValue(seller.status),
    },
    businessProfile: {
      owner_mobile: stringValue(seller.support_phone),
      warehouse_pickup_address: stringValue(seller.warehouse_address),
      warehouse_district: stringValue(seller.warehouse_district),
      warehouse_division: stringValue(seller.warehouse_division),
      customer_return_address: "",
    },
  });
}

export async function PATCH(request: NextRequest) {
  let body: RecordValue;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid store profile update is required." },
      { status: 400 }
    );
  }

  const updates: RecordValue = {};
  if (typeof body.description === "string") updates.bio = body.description.trim();
  if (typeof body.contactPhone === "string")
    updates.support_phone = body.contactPhone.trim();
  if (typeof body.pickupAddress === "string")
    updates.warehouse_address = body.pickupAddress.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No supported store profile fields were provided." },
      { status: 400 }
    );
  }

  const response = await fetchPhpApi(request, "seller/store", updates, "PUT");
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to update store profile." },
      { status: response.status || 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: payload.message || "Store profile updated.",
  });
}

export async function POST(request: NextRequest) {
  let body: RecordValue;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid store setting update is required." },
      { status: 400 }
    );
  }
  if (typeof body.vacationMode !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Vacation mode must be true or false." },
      { status: 400 }
    );
  }

  const response = await fetchPhpApi(
    request,
    "seller/settings/vacation",
    { vacation_mode: body.vacationMode },
    "PATCH"
  );
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to update vacation mode." },
      { status: response.status || 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: payload.message || "Vacation mode updated.",
    vacationMode: Boolean(asRecord(payload.data).vacation_mode),
  });
}
