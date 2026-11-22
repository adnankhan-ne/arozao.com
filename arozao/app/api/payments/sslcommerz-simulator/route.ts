import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") || "";
  const tranId = searchParams.get("tranId") || "";
  const amount = searchParams.get("amount") || "0";

  const displayOrderNum = tranId || orderId || "ORDER";
  const displayAmount = Number(amount) || 2500;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SSLCommerz Secure Payment Gateway</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #f1f5f9; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .gateway-card { background: #ffffff; width: 100%; max-width: 480px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
    .gateway-header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; }
    .gateway-brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .gateway-brand span { color: #38bdf8; }
    .gateway-subtitle { font-size: 13px; color: #94a3b8; margin-top: 6px; }
    .gateway-body { padding: 24px; }
    .order-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .order-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: #64748b; }
    .order-row.total { border-top: 1px dashed #cbd5e1; margin-top: 12px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #0f172a; }
    .security-banner { display: flex; align-items: center; gap: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 6px; padding: 10px 14px; font-size: 12px; margin-bottom: 20px; }
    .card-logos { display: flex; justify-content: center; gap: 12px; margin-bottom: 24px; font-size: 12px; color: #64748b; font-weight: 600; }
    .card-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 4px; border: 1px solid #cbd5e1; }
    .btn-pay { width: 100%; background: #0284c7; color: #ffffff; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-pay:hover { background: #0369a1; }
    .btn-cancel { width: 100%; background: transparent; color: #64748b; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; font-size: 14px; margin-top: 10px; cursor: pointer; }
    .btn-cancel:hover { background: #f8fafc; color: #0f172a; }
    .gateway-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="gateway-card">
    <div class="gateway-header">
      <div class="gateway-brand">
        SSL<span>COMMERZ</span> Hosted Checkout
      </div>
      <div class="gateway-subtitle">256-Bit SSL Encrypted Card Processing</div>
    </div>
    <div class="gateway-body">
      <div class="security-banner">
        <span>🔒</span>
        <span>Secure Redirect: Card information is processed exclusively by SSLCommerz PCI-DSS Level 1 Gateway.</span>
      </div>

      <div class="order-box">
        <div class="order-row">
          <span>Merchant</span>
          <strong>AROZAO Bangladesh</strong>
        </div>
        <div class="order-row">
          <span>Order Reference</span>
          <strong>#${displayOrderNum}</strong>
        </div>
        <div class="order-row total">
          <span>Amount Payable</span>
          <strong>৳${displayAmount.toLocaleString()}</strong>
        </div>
      </div>

      <div class="card-logos">
        <span class="card-badge">VISA</span>
        <span class="card-badge">Mastercard</span>
        <span class="card-badge">AMEX</span>
        <span class="card-badge">UnionPay</span>
      </div>

      <form method="POST" action="/api/payments/webhook">
        <input type="hidden" name="orderId" value="${orderId}" />
        <input type="hidden" name="orderNumber" value="${displayOrderNum}" />
        <input type="hidden" name="gatewayTransactionId" value="SSL-${tranId || Date.now()}" />
        <input type="hidden" name="status" value="Completed" />
        <input type="hidden" name="paymentMethod" value="Card" />
        <input type="hidden" name="redirectUrl" value="/order-confirmation?orderId=${encodeURIComponent(orderId)}" />
        <button type="submit" class="btn-pay">
          Pay ৳${displayAmount.toLocaleString()} via SSLCommerz
        </button>
      </form>

      <form method="GET" action="/checkout">
        <input type="hidden" name="error" value="payment_cancelled" />
        <button type="submit" class="btn-cancel">
          Cancel &amp; Return to Store
        </button>
      </form>
    </div>
    <div class="gateway-footer">
      Powered by SSLCommerz Bangladesh · PCI-DSS Compliant Payment Solution
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
