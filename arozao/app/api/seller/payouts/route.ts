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

function asRecords(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function methodLabel(value: unknown, seller: RecordValue): string {
  const method = text(value).toLowerCase();
  if (method === "bank") {
    const account = text(seller.bank_account);
    return `Bank transfer${account ? ` ••••${account.slice(-4)}` : ""}`;
  }
  if (method === "bkash" || method === "nagad") {
    const wallet = text(seller.mfs_wallet);
    return `${method === "bkash" ? "bKash" : "Nagad"}${wallet ? ` ••••${wallet.slice(-4)}` : ""}`;
  }
  return "Payout account not set";
}

export async function GET(request: NextRequest) {
  const [paymentsResponse, storeResponse] = await Promise.all([
    fetchPhpApi(request, "seller/payments"),
    fetchPhpApi(request, "seller/store"),
  ]);
  const [paymentsPayload, storePayload] = (await Promise.all([
    paymentsResponse.json(),
    storeResponse.json(),
  ])) as [PhpEnvelope, PhpEnvelope];

  if (!paymentsResponse.ok || !paymentsPayload.success) {
    return NextResponse.json(
      { ok: false, error: paymentsPayload.message || paymentsPayload.error || "Failed to load seller payments." },
      { status: paymentsResponse.status || 502 }
    );
  }
  if (!storeResponse.ok || !storePayload.success) {
    return NextResponse.json(
      { ok: false, error: storePayload.message || storePayload.error || "Failed to load payout account details." },
      { status: storeResponse.status || 502 }
    );
  }

  const payments = asRecord(paymentsPayload.data);
  const seller = asRecord(storePayload.data);
  const earnings = asRecords(payments.earnings).map((row) => {
    const earningStatus = text(row.status).toLowerCase();
    return {
      id: String(row.id ?? ""),
      gross_order_amount: numeric(row.gross_amount),
      platform_commission_rate: numeric(row.commission_rate),
      platform_commission_amount: numeric(row.commission_amount),
      net_seller_amount: numeric(row.net_earnings),
      status:
        earningStatus === "available"
          ? "Available_for_Payout"
          : earningStatus === "withdrawn"
          ? "Paid"
          : earningStatus === "held"
          ? "Pending_Delivery"
          : "Reversed",
      created_at: text(row.created_at),
      sub_orders: {
        sub_order_number: text(row.order_number, `SO-${row.sub_order_id ?? row.id}`),
        fulfillment_status: text(row.order_status),
      },
    };
  });
  const payouts = asRecords(payments.payouts).map((row) => ({
    id: String(row.id ?? ""),
    created_at: text(row.created_at),
    amount: numeric(row.amount),
    payout_method: text(row.payout_method),
    transaction_ref: text(row.transaction_ref, "Pending"),
    status:
      text(row.status).toLowerCase() === "completed"
        ? "Completed"
        : text(row.status).toLowerCase() === "processing"
        ? "Processing"
        : text(row.status).toLowerCase() === "rejected"
        ? "Failed"
        : "Pending",
  }));
  const totalGrossSales = numeric(payments.gross_total);
  const totalCommissionDeducted = numeric(payments.commission_total);
  const processingPayoutBalance = payouts
    .filter((payout) => payout.status === "Pending" || payout.status === "Processing")
    .reduce((total, payout) => total + payout.amount, 0);
  const paidOutBalance = payouts
    .filter((payout) => payout.status === "Completed")
    .reduce((total, payout) => total + payout.amount, 0);

  return NextResponse.json({
    ok: true,
    balances: {
      availableForPayoutBalance: numeric(payments.available_balance),
      pendingDeliveryBalance: numeric(payments.escrow_balance),
      processingPayoutBalance,
      paidOutBalance,
      totalGrossSales,
      totalCommissionDeducted,
    },
    payoutAccountLabel: methodLabel(seller.payout_method, seller),
    payouts,
    earnings,
  });
}

export async function POST(request: NextRequest) {
  let body: RecordValue;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid payout request is required." },
      { status: 400 }
    );
  }
  const amount = numeric(body.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { ok: false, error: "Payout requests must be at least ৳100." },
      { status: 422 }
    );
  }

  const response = await fetchPhpApi(
    request,
    "seller/payments/withdraw",
    { amount },
    "POST"
  );
  const payload = (await response.json()) as PhpEnvelope;
  if (!response.ok || !payload.success) {
    return NextResponse.json(
      { ok: false, error: payload.message || payload.error || "Failed to submit payout request." },
      { status: response.status || 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: payload.message || "Payout request submitted.",
    request: payload.data,
  });
}
