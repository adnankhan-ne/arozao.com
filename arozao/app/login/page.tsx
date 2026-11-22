"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginWithCredentials } from "@/lib/auth";
import { requestPasswordResetAction } from "./actions";
import PasswordResetForm, {
  type RecoveryTokenKind,
} from "./PasswordResetForm";

type AuthViewMode = "signin" | "forgot" | "update-password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthViewMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [recoveryTokenKind, setRecoveryTokenKind] =
    useState<RecoveryTokenKind>("single_use");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const queryToken = searchParams.get("token");
    const queryEmail = searchParams.get("email");
    const requestedMode = searchParams.get("mode");

    if (queryEmail) {
      setEmail(queryEmail);
    }

    if (queryToken) {
      if (requestedMode !== "update-password") {
        const normalizedUrl = new URL(window.location.href);
        normalizedUrl.searchParams.set("mode", "update-password");
        window.history.replaceState({}, document.title, normalizedUrl.toString());
      }
      setRecoveryToken(queryToken);
      setRecoveryTokenKind("single_use");
      setMode("update-password");
    } else if (requestedMode === "update-password") {
      setMode("update-password");
    } else if (requestedMode === "forgot") {
      setMode("forgot");
    }
  }, []);

  const switchMode = (nextMode: AuthViewMode) => {
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const { user, error: loginError } = await loginWithCredentials(
      email,
      password
    );
    setIsSubmitting(false);

    if (!user) {
      setError(
        loginError ||
          "Invalid email or password. Please verify your credentials or create a new customer account."
      );
      return;
    }

    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const redirectTo = params?.get("redirect");

    if (redirectTo && redirectTo.startsWith("/")) {
      router.push(redirectTo);
    } else if (user.role === "admin" || user.role === "super_admin") {
      router.push("/admin");
    } else if (user.role === "seller") {
      router.push("/seller/dashboard");
    } else {
      router.push("/account");
    }
  };

  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your account email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?mode=update-password`
        : undefined;
    const result = await requestPasswordResetAction({
      email: trimmedEmail,
      redirectTo,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(
        result.error || "Unable to send password reset link. Please try again."
      );
      return;
    }

    setSuccessMessage(
      result.message ||
        "If an account exists with this email, we've sent you a password reset link."
    );
  };

  return (
    <main className="site-content">
      <div className="page-intro">
        <span className="eyebrow">
          {mode === "signin"
            ? "Welcome back"
            : mode === "forgot"
            ? "Account recovery"
            : "Set new password"}
        </span>
        <h1>
          {mode === "signin"
            ? "Sign in to Arozao"
            : mode === "forgot"
            ? "Forgot your password?"
            : "Create a new password"}
        </h1>
      </div>

      {mode === "signin" && (
        <form className="form-card" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label htmlFor="login-password" style={{ marginBottom: 0 }}>
              Password
            </label>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--accent-dark, #8b5e3c)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />

          {error && <p className="coupon-error-msg">{error}</p>}
          {successMessage && (
            <p
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(22, 101, 52, 0.08)",
                color: "#166534",
                fontSize: "0.9rem",
                margin: "4px 0 12px",
              }}
            >
              {successMessage}
            </p>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <p style={{ marginTop: 18 }}>
            Need an account? <Link href="/register">Create one</Link>
          </p>
        </form>
      )}

      {mode === "forgot" && (
        <form className="form-card" onSubmit={handleForgotSubmit}>
          <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.85 }}>
            Enter the email address associated with your Arozao account and we
            will send you a link to reset your password.
          </p>

          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          {error && <p className="coupon-error-msg">{error}</p>}
          {successMessage && (
            <p
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(22, 101, 52, 0.08)",
                color: "#166534",
                fontSize: "0.9rem",
                margin: "4px 0 12px",
              }}
            >
              {successMessage}
            </p>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </button>

          <p style={{ marginTop: 18 }}>
            Remembered your password?{" "}
            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                fontWeight: 600,
                color: "inherit",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to Sign in
            </button>
          </p>
        </form>
      )}

      {mode === "update-password" && (
        <PasswordResetForm
          recoveryToken={recoveryToken}
          recoveryTokenKind={recoveryTokenKind}
          email={email}
          initialError={error}
          onSuccess={(message) => {
            setRecoveryToken("");
            setMode("signin");
            setError("");
            setSuccessMessage(message);
            router.push("/login");
          }}
          onRequestNewLink={() => {
            setRecoveryToken("");
            switchMode("forgot");
          }}
          onBackToSignIn={() => {
            setRecoveryToken("");
            switchMode("signin");
          }}
        />
      )}
    </main>
  );
}
