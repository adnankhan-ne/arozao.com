"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthAccessToken } from "@/lib/auth";
import { SellerPayoutRecord } from "@/types/seller";

interface SellerEarningRow {
  id: string;
  gross_order_amount: number;
  platform_commission_rate: number;
  platform_commission_amount: number;
  net_seller_amount: number;
  status: string;
  created_at: string;
  sub_orders?: {
    sub_order_number?: string;
    fulfillment_status?: string;
  };
}

export default function SellerPaymentsPage() {
  const [payouts, setPayouts] = useState<SellerPayoutRecord[]>([]);
  const [earnings, setEarnings] = useState<SellerEarningRow[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [processingBalance, setProcessingBalance] = useState(0);
  const [paidOutBalance, setPaidOutBalance] = useState(0);
  const [totalGrossSales, setTotalGrossSales] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [payoutAccountLabel, setPayoutAccountLabel] = useState(
    "Verified Merchant Account"
  );
  const [requestSent, setRequestSent] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPayoutData = useCallback(async () => {
    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/payouts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMessage(data?.error || "Failed to load seller payment data.");
        return;
      }
      setErrorMessage("");
      if (data?.ok) {
        setAvailableBalance(
          Number(
            data.balances?.availableForPayoutBalance ??
              data.summary?.availableForPayout ??
              0
          )
        );
        setPendingBalance(
          Number(
            data.balances?.pendingDeliveryBalance ??
              data.summary?.pendingClearance ??
              0
          )
        );
        setProcessingBalance(
          Number(
            data.balances?.processingPayoutBalance ??
              data.summary?.processingPayout ??
              0
          )
        );
        setPaidOutBalance(
          Number(data.balances?.paidOutBalance ?? data.summary?.paidOut ?? 0)
        );
        setTotalGrossSales(
          Number(
            data.balances?.totalGrossSales ??
              data.summary?.totalGrossSales ??
              0
          )
        );
        setTotalCommission(
          Number(
            data.balances?.totalCommissionDeducted ??
              data.summary?.totalCommissionDeducted ??
              0
          )
        );
        if (data.payoutAccountLabel) {
          setPayoutAccountLabel(data.payoutAccountLabel);
        }
        if (Array.isArray(data.earnings)) {
          setEarnings(data.earnings);
        }
        if (Array.isArray(data.payouts)) {
          setPayouts(
            data.payouts.map((po: Record<string, unknown>) => ({
              id: String(po.id ?? ""),
              payoutDate: new Date(String(po.created_at)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              amount: Number(po.amount ?? 0),
              method: String(po.payout_method || data.payoutAccountLabel || "Payout account"),
              referenceNumber: String(po.transaction_ref || "Pending"),
              status:
                po.status === "Completed"
                  ? "Completed"
                  : po.status === "Processing"
                  ? "Processing"
                  : po.status === "Failed"
                  ? "Failed"
                  : "Pending",
            }))
          );
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load seller payment data."
      );
    }
  }, []);

  useEffect(() => {
    void loadPayoutData();
  }, [loadPayoutData]);

  const handleRequestEarlySettlement = async () => {
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const token = getAuthAccessToken();
      const res = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ amount: Number(availableBalance.toFixed(2)) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMessage(
          data?.error || "No eligible matured balance available for payout."
        );
        return;
      }
      setRequestSent(true);
      setNoticeMessage(
        data.message || "Early payout request submitted to Arozao Finance Desk."
      );
      await loadPayoutData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit payout request."
      );
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <div>
          <span className="badge rounded-pill bg-primary-subtle text-primary mb-2">Finance &amp; Settlements</span>
          <h1 className="h3 fw-bold mb-2">Payments &amp; Direct Bank Deposits</h1>
          <p className="text-secondary mb-0">
            Transparent weekly earnings settlements directly into your verified
            bank account or MFS wallet.
          </p>
        </div>
      </div>

      {noticeMessage && (
        <div className="alert alert-success rounded-3 mb-3 d-flex align-items-center gap-2" role="status">
          <span className="fw-bold">✓</span>
          <span className="small fw-semibold">
            {noticeMessage}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Payout Metric Highlights */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-4">
        <div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body">
          <small>Available for Payout</small>
          <h2 className="h3 fw-bold text-success my-2">৳{availableBalance.toLocaleString()}</h2>
          <span className="badge rounded-pill bg-warning-subtle text-warning">
            Pending Delivery Clearance: ৳{pendingBalance.toLocaleString()}
          </span>
          <button
            type="button"
            className="btn btn-primary w-100 mt-3"
            onClick={handleRequestEarlySettlement}
            disabled={requestSent || availableBalance < 100}
          >
            {requestSent ? "✓ Request Logged" : "⚡ Request Early Payout"}
          </button>
          <p className="small text-secondary mt-2 mb-0">Minimum payout request: ৳100.</p>
        </div></div></div>

        <div className="col-12 col-xl-4"><div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body">
          <small className="text-secondary">Gross Sales &amp; Commission</small>
          <h3 className="h5 fw-bold mt-2">৳{totalGrossSales.toLocaleString()} Gross</h3>
          <p className="small text-secondary">
            Platform Commission: ৳{totalCommission.toLocaleString()} · Paid Out:
            ৳{paidOutBalance.toLocaleString()}
          </p>
          <span className="badge rounded-pill bg-primary-subtle text-primary">
            Processing: ৳{processingBalance.toLocaleString()}
          </span>
        </div></div></div>

        <div className="col-12 col-xl-4"><div className="card h-100 border-0 shadow-sm rounded-4"><div className="card-body">
          <small className="text-secondary">Linked Settlement Account</small>
          <h3 className="h5 fw-bold mt-2">{payoutAccountLabel}</h3>
          <p className="small text-secondary">Configured during Seller KYC Verification</p>
          <span className="badge rounded-pill bg-success-subtle text-success">Active</span>
        </div></div></div>
      </div>

      {/* Historical Payouts Table */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
        <div className="mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1">Settlement History</h2>
            <p className="small text-secondary mb-0">Past disbursement records and transaction reference numbers.</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th>Disbursement Date</th>
                <th>Amount (BDT)</th>
                <th>Method / Destination</th>
                <th>Bank Reference Number</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-secondary">
                    No payout disbursements recorded yet.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.payoutDate}</strong>
                    </td>
                    <td>
                      <strong className="text-success fs-6">
                        +৳{p.amount.toLocaleString()}
                      </strong>
                    </td>
                    <td>{p.method}</td>
                    <td>
                      <code>{p.referenceNumber}</code>
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill ${
                          p.status === "Completed"
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        ● {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* Seller Earnings Ledger Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body">
        <div className="mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1">Authoritative Sub-Order Earnings Ledger</h2>
            <p className="small text-secondary mb-0">
              Server-calculated gross order value, marketplace commission, and
              net seller settlement per sub-order.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th>Sub-Order Reference</th>
                <th>Date</th>
                <th>Gross Order Amount</th>
                <th>Platform Commission</th>
                <th>Net Seller Payable</th>
                <th>Ledger Status</th>
              </tr>
            </thead>
            <tbody>
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-secondary">
                    No sub-order earnings entries recorded yet.
                  </td>
                </tr>
              ) : (
                earnings.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>
                        {e.sub_orders?.sub_order_number || "Sub-Order"}
                      </strong>
                      {e.sub_orders?.fulfillment_status && (
                        <>
                          <br />
                          <small>{e.sub_orders.fulfillment_status}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {new Date(e.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>৳{Number(e.gross_order_amount ?? 0).toLocaleString()}</td>
                    <td>
                      -৳
                      {Number(
                        e.platform_commission_amount ?? 0
                      ).toLocaleString()}{" "}
                      <small>
                        ({Number(e.platform_commission_rate ?? 10)}%)
                      </small>
                    </td>
                    <td>
                      <strong className="text-success">
                        ৳{Number(e.net_seller_amount ?? 0).toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill ${
                          e.status === "Paid" ||
                          e.status === "Available_for_Payout"
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {e.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}
