"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { SellerApplication, ApplicationStatus } from "@/types/seller";
import {
  fetchSellerApplicationByQueryFromServer,
  updateSellerApplicationStatusOnServer,
} from "@/lib/seller";
import { fetchCurrentProfile, SessionUser } from "@/lib/auth";

export default function AdminSellerDetailPage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = use(params);
  const decodedId = decodeURIComponent(sellerId);
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [app, setApp] = useState<SellerApplication | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAndLoad() {
      const verified = await fetchCurrentProfile();
      if (cancelled) return;

      if (
        !verified ||
        (verified.role !== "admin" && verified.role !== "super_admin")
      ) {
        setAuthChecked(true);
        router.replace("/login");
        return;
      }

      setAdminUser(verified);
      const found = await fetchSellerApplicationByQueryFromServer(
        decodedId,
        true
      );
      if (cancelled) return;

      if (found) {
        setApp(found);
        setNotes(found.reviewerNotes || found.actionRequiredNote || "");
        setRejectionReason(found.rejectionReason || "");
      }
      setAuthChecked(true);
    }

    void verifyAndLoad();

    return () => {
      cancelled = true;
    };
  }, [decodedId, router]);

  if (!authChecked || !adminUser) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <p>Verifying Admin KYC Compliance access...</p>
        </div>
      </main>
    );
  }

  if (!app) {
    return (
      <main className="site-content">
        <div className="empty-state">
          <h1>Seller Application Not Found</h1>
          <p>No application record found for ID: {decodedId}</p>
          <Link href="/admin/sellers" className="button button-primary">
            Back to Admin Seller Queue
          </Link>
        </div>
      </main>
    );
  }

  const fd = app.formData;

  const handleDecision = async (newStatus: ApplicationStatus) => {
    setErrorMsg("");
    setFeedbackBanner("");
    setSaving(true);

    const defaultNote =
      newStatus === "Approved"
        ? "KYC documents, NID, and payout account verified by Arozao Compliance Team."
        : newStatus === "Action Required"
        ? "Please re-upload clearer verification documents as noted by our compliance team."
        : newStatus === "Rejected"
        ? "Application did not meet Arozao seller KYC requirements."
        : notes;

    const finalNote = notes.trim() || defaultNote;

    const result = await updateSellerApplicationStatusOnServer(
      app.applicationId,
      newStatus,
      {
        reviewerNotes: finalNote,
        actionRequiredNote:
          newStatus === "Action Required" ? finalNote : undefined,
        rejectionReason:
          newStatus === "Rejected"
            ? rejectionReason.trim() || finalNote
            : undefined,
      }
    );

    setSaving(false);

    if (!result.ok) {
      setErrorMsg(result.error || "Failed to update seller application.");
      return;
    }

    if (result.application) {
      setApp(result.application);
      setNotes(
        result.application.reviewerNotes ||
          result.application.actionRequiredNote ||
          finalNote
      );
    } else {
      const refreshed = await fetchSellerApplicationByQueryFromServer(
        decodedId,
        true
      );
      if (refreshed) setApp(refreshed);
    }

    setFeedbackBanner(
      `Decision saved: Application status updated to "${newStatus}".`
    );
  };

  return (
    <main className="site-content">
      <div className="admin-portal-shell">
        <div className="admin-topbar">
          <div>
            <Link href="/admin/sellers" className="wizard-back-link">
              ← Back to Seller Applications Queue
            </Link>
            <h1>
              KYC Inspection: {fd.store.storeName} ({app.applicationId})
            </h1>
            <p>
              Reserved Seller ID: <strong>{app.sellerId}</strong> · Submitted{" "}
              {new Date(app.submittedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <span
              className={`status-badge ${
                app.status === "Approved"
                  ? "status-approved"
                  : app.status === "Action Required"
                  ? "status-action"
                  : app.status === "Rejected" || app.status === "Suspended"
                  ? "status-rejected"
                  : "status-review"
              }`}
              style={{ fontSize: 15, padding: "8px 16px" }}
            >
              Current Status: {app.status}
            </span>
          </div>
        </div>

        {feedbackBanner && (
          <div className="admin-toast-banner">{feedbackBanner}</div>
        )}
        {errorMsg && (
          <div className="auth-error-banner" style={{ marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        <div className="admin-detail-grid">
          {/* Left Column: Submitted KYC Data */}
          <div className="admin-detail-main">
            {/* Section 1 */}
            <div className="seller-form-card" style={{ marginBottom: 20 }}>
              <h3>1. Applicant &amp; Store Identity</h3>
              <div className="kyc-info-grid">
                <div>
                  <small>Applicant Full Name</small>
                  <strong>{fd.account.fullName}</strong>
                </div>
                <div>
                  <small>Store Display Name</small>
                  <strong>{fd.store.storeName}</strong>
                </div>
                <div>
                  <small>Mobile Number</small>
                  <strong>{fd.account.mobile}</strong>
                </div>
                <div>
                  <small>Email Address</small>
                  <strong>{fd.account.email}</strong>
                </div>
                <div>
                  <small>Seller Type</small>
                  <strong style={{ textTransform: "capitalize" }}>
                    {fd.business.sellerType.replace("_", " ")}
                  </strong>
                </div>
                <div>
                  <small>Primary Category</small>
                  <strong>{fd.store.categories.join(", ") || "General"}</strong>
                </div>
                <div>
                  <small>Division &amp; District</small>
                  <strong>
                    {fd.address.district}, {fd.address.division}
                  </strong>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="seller-form-card" style={{ marginBottom: 20 }}>
              <h3>2. Legal Identity, NID &amp; Addresses</h3>
              <div className="kyc-info-grid">
                <div>
                  <small>Owner Legal Name (NID)</small>
                  <strong>{fd.sellerInfo.legalFullName}</strong>
                </div>
                <div>
                  <small>National ID (NID) Number</small>
                  <strong>{fd.sellerInfo.nidNumber}</strong>
                </div>
                <div>
                  <small>Registered Business Name</small>
                  <strong>
                    {fd.business.businessName || "N/A (Individual)"}
                  </strong>
                </div>
                <div>
                  <small>Trade License Number</small>
                  <strong>
                    {fd.business.tradeLicenseNumber || "Not Provided"}
                  </strong>
                </div>
                <div>
                  <small>TIN / BIN Number</small>
                  <strong>
                    {fd.business.tinNumber ||
                      fd.business.binVatNumber ||
                      "Not Provided"}
                  </strong>
                </div>
                <div>
                  <small>Business Address</small>
                  <strong>{fd.business.businessAddress}</strong>
                </div>
                <div>
                  <small>Courier Pickup Address</small>
                  <strong>{fd.address.pickupAddress}</strong>
                </div>
                <div>
                  <small>Customer Return Address</small>
                  <strong>{fd.address.returnAddress}</strong>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="seller-form-card" style={{ marginBottom: 20 }}>
              <h3>3. Bank / MFS Settlement Account</h3>
              <div className="kyc-info-grid">
                <div>
                  <small>Selected Payout Method</small>
                  <strong style={{ textTransform: "uppercase" }}>
                    {fd.payment.paymentType === "bank"
                      ? "Bank Transfer (BEFTN)"
                      : fd.payment.mfsDetails.provider}
                  </strong>
                </div>
                {fd.payment.paymentType === "bank" ? (
                  <>
                    <div>
                      <small>Beneficiary Account Holder</small>
                      <strong>
                        {fd.payment.bankDetails.accountHolderName}
                      </strong>
                    </div>
                    <div>
                      <small>Bank Name</small>
                      <strong>{fd.payment.bankDetails.bankName}</strong>
                    </div>
                    <div>
                      <small>Branch Name</small>
                      <strong>{fd.payment.bankDetails.branchName}</strong>
                    </div>
                    <div>
                      <small>Account Number</small>
                      <strong>{fd.payment.bankDetails.accountNumber}</strong>
                    </div>
                    <div>
                      <small>Routing Number</small>
                      <strong>
                        {fd.payment.bankDetails.routingNumber || "N/A"}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <small>MFS Provider</small>
                      <strong>{fd.payment.mfsDetails.provider}</strong>
                    </div>
                    <div>
                      <small>MFS Wallet Number</small>
                      <strong>{fd.payment.mfsDetails.walletNumber}</strong>
                    </div>
                    <div>
                      <small>Wallet Type</small>
                      <strong style={{ textTransform: "capitalize" }}>
                        {fd.payment.mfsDetails.accountType}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section 4: Uploaded Documents */}
            <div className="seller-form-card">
              <h3>4. Uploaded KYC Verification Documents</h3>
              <div className="kyc-doc-cards">
                {fd.documents.length > 0 ? (
                  fd.documents.map((doc) => (
                    <div key={doc.id} className="doc-preview-item">
                      <span>📎 {doc.title}</span>
                      <strong>
                        {doc.fileName} ({doc.status})
                      </strong>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--color-text-secondary)" }}>
                    Standard KYC documents on file.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Compliance Decision Panel */}
          <div className="admin-decision-sidebar">
            <div className="seller-form-card">
              <h3>Compliance Officer Decision</h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  marginBottom: 16,
                }}
              >
                Approving this application activates the merchant&apos;s Seller
                Account and creates/unlocks their store.
              </p>

              <div className="form-group">
                <label htmlFor="adm-notes">
                  Reviewer Notes / Feedback to Applicant
                </label>
                <textarea
                  id="adm-notes"
                  rows={4}
                  placeholder="Enter verification notes or instructions if requesting document re-upload..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="adm-reject">
                  Rejection Reason (If rejecting application)
                </label>
                <input
                  id="adm-reject"
                  type="text"
                  placeholder="e.g. Unverifiable NID or mismatched bank beneficiary"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="admin-decision-buttons">
                <button
                  type="button"
                  className="button button-primary"
                  disabled={saving}
                  onClick={() => handleDecision("Approved")}
                >
                  ✅ Approve &amp; Activate Seller Account
                </button>

                <button
                  type="button"
                  className="button button-secondary"
                  disabled={saving}
                  onClick={() => handleDecision("Action Required")}
                >
                  ⚠️ Request More Info / Document Re-upload
                </button>

                <button
                  type="button"
                  className="button button-secondary"
                  style={{ color: "#b91c1c", borderColor: "#fecaca" }}
                  disabled={saving}
                  onClick={() => handleDecision("Rejected")}
                >
                  ❌ Reject Application
                </button>

                {app.status === "Approved" && (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ color: "#b91c1c" }}
                    disabled={saving}
                    onClick={() => handleDecision("Suspended")}
                  >
                    🚫 Suspend Seller Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
