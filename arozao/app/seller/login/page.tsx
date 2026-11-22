"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthAccessToken, loginWithCredentials, logoutUser } from "@/lib/auth";
import { setSellerSession, logoutSeller } from "@/lib/seller";

export default function SellerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const cleanIdentifier = identifier.trim().toLowerCase();
    if (!cleanIdentifier || !password) {
      setError("Please enter your registered email address and password.");
      return;
    }

    setIsLoading(true);
    const { user, error: loginErr } = await loginWithCredentials(
      cleanIdentifier,
      password
    );

    if (!user) {
      setIsLoading(false);
      setError(
        loginErr || "Invalid merchant credentials. Please verify your email and password."
      );
      return;
    }

    // Enforce authoritative server role check: only approved sellers and admins may enter Seller Center
    if (
      user.role !== "seller" &&
      user.role !== "admin" &&
      user.role !== "super_admin"
    ) {
      await logoutUser();
      logoutSeller();
      setIsLoading(false);
      setError(
        "Forbidden: Your account does not have approved Seller privileges yet. Please check your application status."
      );
      return;
    }

    // Fetch authoritative store profile from /api/seller/store
    try {
      const token = getAuthAccessToken();
      const storeRes = await fetch("/api/seller/store", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const storeData = storeRes.ok ? await storeRes.json() : null;
      const store = storeData?.store;
      if (!storeRes.ok || !storeData?.ok || !store) {
        setError(
          storeData?.error ||
            "This login has no seller profile linked to it. Submit a seller application, or contact support if you already applied."
        );
        setIsLoading(false);
        return;
      }

      const storeStatus = String(store.status || "").toLowerCase();
      if (storeStatus !== "approved") {
        setError(
          storeStatus === "pending" || storeStatus === "under_review"
            ? "Your seller application is awaiting review. Seller Center will be available after approval."
            : `Seller Center access is unavailable because this seller account is ${storeStatus || "not approved"}.`
        );
        setIsLoading(false);
        return;
      }

      setSellerSession({
        sellerId: store.seller_code,
        applicationId: "",
        name: user.name,
        email: user.email,
        storeName: store.store_name || user.name,
        storeSlug: store.store_slug || "merchant-store",
        status: "Approved",
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not verify the seller profile. Please try again."
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.push("/seller/dashboard");
  };

  return (
    <main className="merchant-auth-viewport">
      <div className="merchant-auth-card">
        {/* Card Header */}
        <div className="auth-card-top">
          <Link href="/" className="auth-brand-logo" aria-label="Arozao Home">
            <span className="logo-text-bold">arozao</span>
            <span className="logo-center-badge">Seller Center</span>
          </Link>
          <h1 className="auth-card-title">Sign In to Merchant Portal</h1>
          <p className="auth-card-subtitle">
            Manage your catalog, fulfill customer orders, and track bank payouts across Bangladesh.
          </p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}
        {notice && (
          <div
            className="auth-error-banner"
            style={{
              background: "#ecfdf5",
              color: "#065f46",
              borderColor: "#a7f3d0",
            }}
          >
            ✓ {notice}
          </div>
        )}

        <form className="auth-card-form" onSubmit={handleLogin}>
          <div className="auth-form-field">
            <label htmlFor="seller-identifier" className="auth-field-label">
              Registered Merchant Email
            </label>
            <input
              id="seller-identifier"
              type="email"
              className="auth-field-input"
              placeholder="e.g. merchant@yourstore.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-field">
            <div className="auth-label-row">
              <label htmlFor="seller-pass" className="auth-field-label">
                Password
              </label>
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => {
                  setError("");
                  setNotice(
                    `Please contact Arozao Merchant Compliance Support to reset credentials for ${
                      identifier || "your registered email"
                    }.`
                  );
                }}
              >
                Forgot password?
              </button>
            </div>

            <div className="auth-password-wrapper">
              <input
                id="seller-pass"
                type={showPassword ? "text" : "password"}
                className="auth-field-input auth-password-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-reveal"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="button button-primary auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Verifying Merchant Credentials..." : "Sign In to Seller Center"}
          </button>
        </form>

        <div className="auth-card-footer">
          <div className="auth-nav-link-item">
            <span>New to AROZAO? </span>
            <Link href="/sell-on-arozao/register" className="auth-action-link">
              Create Seller Account &rarr;
            </Link>
          </div>
          <div className="auth-nav-link-item">
            <span>Submitted an application? </span>
            <Link
              href="/sell-on-arozao/application-status"
              className="auth-action-link"
            >
              Track Application Status &rarr;
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
