"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SellerApplication } from "@/types/seller";
import {
  fetchSellerApplicationByQueryFromServer,
  resubmitApplicationDocumentOnServer,
} from "@/lib/seller";
import { fetchCurrentProfile } from "@/lib/auth";

function ApplicationStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams?.get("id") || "";

  const [query, setQuery] = useState(initialQuery);
  const [app, setApp] = useState<SellerApplication | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState("");
  const [resubmitError, setResubmitError] = useState("");

  useEffect(() => {
    if (initialQuery) {
      void lookupApplication(initialQuery);
    }
  }, [initialQuery]);

  const lookupApplication = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    try {
      const found = await fetchSellerApplicationByQueryFromServer(
        trimmed,
        false
      );
      setApp(found);
    } catch {
      setApp(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    void lookupApplication(query.trim());
    setResubmitSuccess("");
  };

  const handleResubmitDocument = async (
    docType:
      | "nid_front"
      | "nid_back"
      | "trade_license"
      | "bank_cheque_or_statement",
    title: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !app) return;

    const result = await resubmitApplicationDocumentOnServer(
      app.applicationId,
      {
        docType,
        title,
        fileName: file.name,
        fileSize: file.size,
      }
    );
    if (result.ok && result.application) {
      setResubmitError("");
      setApp(result.application);
      setResubmitSuccess(
        `Document "${file.name}" uploaded! Your application is now back Under Review.`
      );
    } else {
      setResubmitSuccess("");
      setResubmitError(
        result.error || "Document resubmission is currently unavailable."
      );
    }
  };

  const handleEnterSellerPortal = async () => {
    if (!app || app.status !== "Approved") return;
    const verifiedUser = await fetchCurrentProfile();
    if (
      verifiedUser &&
      (verifiedUser.role === "seller" ||
        verifiedUser.role === "admin" ||
        verifiedUser.role === "super_admin")
    ) {
      router.push("/seller/dashboard");
    } else {
      router.push("/seller/login");
    }
  };

  const getBadgeClass = (status: SellerApplication["status"]) => {
    switch (status) {
      case "Approved":
        return "status-badge status-approved";
      case "Action Required":
        return "status-badge status-action";
      case "Rejected":
        return "status-badge status-rejected";
      case "Suspended":
        return "status-badge status-rejected";
      default:
        return "status-badge status-review";
    }
  };

  const fd = app?.formData;

  return (
    <div className="seller-wizard-shell">
      <div className="seller-wizard-header">
        <div>
          <Link href="/sell-on-arozao" className="wizard-back-link">
            ← Back to Sell on Arozao
          </Link>
          <h1>Track Seller Application Status</h1>
          <p>
            Sign in with the account used to apply, then enter your application
            reference. For privacy, only that account&apos;s application is shown.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="status-lookup-card">
        <form className="status-lookup-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Enter your application reference"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Application ID, Email, or Mobile"
          />
          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </form>
      </div>

      {searched && !loading && !app && (
        <div className="empty-state">
          <h2>No Matching Application Found</h2>
          <p>
            No application was found for this account. Sign in with the account
            used to apply, then check again. If you have not applied yet, start
            a new seller application.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link href="/seller/login" className="button button-primary">
              Sign in to check status
            </Link>
            <Link href="/sell-on-arozao/register" className="button button-secondary">
              Start a New Application
            </Link>
          </div>
        </div>
      )}

      {app && !app.formData && (
        <div className="application-status-detail-card">
          <div className="status-detail-header">
            <div>
              <span className="status-id-eyebrow">
                Seller application #{app.applicationId}
              </span>
              <h2>Application status</h2>
            </div>
            <div className="status-badge-wrap">
              <span className={getBadgeClass(app.status)}>{app.status}</span>
              {app.submittedAt && (
                <small>
                  Submitted{" "}
                  {new Date(app.submittedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </small>
              )}
            </div>
          </div>
          {app.status === "Approved" && (
            <button
              type="button"
              className="button button-primary"
              onClick={handleEnterSellerPortal}
            >
              Enter Seller Center
            </button>
          )}
        </div>
      )}

      {app && fd && (
        <div className="application-status-detail-card">
          <div className="status-detail-header">
            <div>
              <span className="status-id-eyebrow">
                Application #{app.applicationId} · Reserved Seller ID:{" "}
                {app.sellerId}
              </span>
              <h2>{fd.store.storeName}</h2>
              <p>
                Applicant: <strong>{fd.account.fullName}</strong> · Category:{" "}
                {fd.store.categories[0] || "General"} · {fd.address.district},{" "}
                {fd.address.division}
              </p>
            </div>
            <div className="status-badge-wrap">
              <span className={getBadgeClass(app.status)}>{app.status}</span>
              <small>
                Submitted{" "}
                {new Date(app.submittedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            </div>
          </div>

          {/* Visual Timeline */}
          <div className="status-progress-timeline">
            <div className="timeline-node is-done">
              <div className="node-dot">✓</div>
              <div>
                <strong>1. Application Submitted</strong>
                <span>KYC &amp; store details received</span>
              </div>
            </div>

            <div
              className={`timeline-node ${
                app.status === "Under Review"
                  ? "is-current"
                  : app.status === "Approved"
                  ? "is-done"
                  : app.status === "Action Required"
                  ? "is-warning"
                  : "is-error"
              }`}
            >
              <div className="node-dot">
                {app.status === "Approved"
                  ? "✓"
                  : app.status === "Action Required"
                  ? "!"
                  : app.status === "Rejected"
                  ? "✕"
                  : "2"}
              </div>
              <div>
                <strong>2. Compliance &amp; KYC Verification</strong>
                <span>NID, Trade License &amp; Bank account check</span>
              </div>
            </div>

            <div
              className={`timeline-node ${
                app.status === "Approved" ? "is-done" : ""
              }`}
            >
              <div className="node-dot">
                {app.status === "Approved" ? "✓" : "3"}
              </div>
              <div>
                <strong>3. Seller Account Activated</strong>
                <span>Full access to Arozao Seller Center</span>
              </div>
            </div>
          </div>

          {/* Status-specific Callout Box */}
          {app.status === "Under Review" && (
            <div className="status-notice-box notice-review">
              <h3>⏳ Your Application is Currently Under Review</h3>
              <p>
                Our Seller Compliance Team is verifying your submitted National
                ID and payout details. Most applications are reviewed within{" "}
                <strong>24–48 business hours</strong>.
              </p>
            </div>
          )}

          {app.status === "Action Required" && (
            <div className="status-notice-box notice-action">
              <h3>⚠️ Action Required: Document Re-upload Needed</h3>
              <p className="reviewer-feedback">
                <strong>Compliance Reviewer Note:</strong>{" "}
                {app.actionRequiredNote ||
                  app.reviewerNotes ||
                  "Please re-upload a clearer copy of your verification documents."}
              </p>

              {resubmitSuccess && (
                <div className="resubmit-success-banner">{resubmitSuccess}</div>
              )}
              {resubmitError && (
                <div className="alert alert-warning" role="alert">
                  {resubmitError}
                </div>
              )}

              <div className="resubmit-upload-grid">
                <div className="kyc-upload-box">
                  <label>Re-upload NID Back Side</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleResubmitDocument("nid_back", "NID Back", e)
                    }
                  />
                </div>
                <div className="kyc-upload-box">
                  <label>Re-upload Trade License / Bank Proof</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleResubmitDocument(
                        "trade_license",
                        "Trade License",
                        e
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {app.status === "Approved" && (
            <div className="status-notice-box notice-approved">
              <h3>🎉 Congratulations! Your Seller Account is Approved</h3>
              <p>
                {app.reviewerNotes ||
                  "Your KYC and bank payout details have been verified. You can now access the Arozao Seller Center."}
              </p>
              <div className="approved-cta-row">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleEnterSellerPortal}
                >
                  Open Arozao Seller Center →
                </button>
              </div>
            </div>
          )}

          {app.status === "Rejected" && (
            <div className="status-notice-box notice-rejected">
              <h3>❌ Application Not Approved</h3>
              <p>
                <strong>Reason:</strong>{" "}
                {app.rejectionReason ||
                  app.reviewerNotes ||
                  "Submitted KYC documents did not meet marketplace compliance criteria."}
              </p>
              <p>
                If you believe this was an error or have updated business
                registration documents, you may submit a new application.
              </p>
              <Link
                href="/sell-on-arozao/register"
                className="button button-secondary"
              >
                Submit New Application
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationStatusPage() {
  return (
    <main className="site-content">
      <Suspense
        fallback={
          <div className="seller-wizard-shell">
            <div className="empty-state">
              <p>Loading application status tracker...</p>
            </div>
          </div>
        }
      >
        <ApplicationStatusContent />
      </Suspense>
    </main>
  );
}
