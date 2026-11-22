"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastNotification";
import { updatePasswordWithRecoveryAction } from "./actions";

export type RecoveryTokenKind = "single_use";

interface PasswordResetFormProps {
  recoveryToken: string;
  recoveryTokenKind: RecoveryTokenKind;
  email?: string;
  initialError?: string;
  onSuccess: (message: string) => void;
  onRequestNewLink: () => void;
  onBackToSignIn: () => void;
}

export default function PasswordResetForm({
  recoveryToken,
  recoveryTokenKind,
  email,
  initialError = "",
  onSuccess,
  onRequestNewLink,
  onBackToSignIn,
}: PasswordResetFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedMessage, setCompletedMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // 3-second auto-redirect countdown to login page after successful password update
  useEffect(() => {
    if (!isCompleted) return;

    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, document.title, "/login");
          }
          router.push("/login");
          onSuccessRef.current(completedMessage);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompleted, completedMessage, router]);

  // Read the single-use token from props or the reset URL.
  const resolveRecoveryParams = (): {
    token: string;
    kind: RecoveryTokenKind;
    resolvedEmail?: string;
  } => {
    if (recoveryToken) {
      return { token: recoveryToken, kind: recoveryTokenKind, resolvedEmail: email };
    }
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = email || searchParams.get("email") || undefined;
      const queryToken = searchParams.get("token");
      if (queryToken) {
        return { token: queryToken, kind: "single_use", resolvedEmail: urlEmail };
      }
    }
    return { token: "", kind: recoveryTokenKind, resolvedEmail: email };
  };

  const {
    token: effectiveToken,
    kind: effectiveTokenKind,
    resolvedEmail,
  } = resolveRecoveryParams();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");

    if (!effectiveToken) {
      setError(
        "This password reset link is missing or has expired. Please request a new reset link."
      );
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match. Please confirm your new password.");
      return;
    }

    setIsSubmitting(true);

    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;

    const result = await updatePasswordWithRecoveryAction({
      recoveryToken: effectiveToken,
      tokenType: effectiveTokenKind,
      email: resolvedEmail,
      newPassword,
      origin,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(
        result.error ||
          "Unable to update password. Your recovery link may have expired."
      );
      return;
    }

    // Remove sensitive recovery tokens from browser URL bar after use
    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, "/login");
    }

    const msg =
      result.message ||
      "Your password has been updated successfully. You can now sign in with your new password.";

    setNewPassword("");
    setConfirmNewPassword("");
    setCompletedMessage(msg);
    setIsCompleted(true);
    setCountdown(3);
    showToast("Password updated successfully", {
      type: "success",
    });
  };

  // Real-time validation states during typing
  const passwordLength = newPassword.length;
  const isPasswordFormatInvalid = passwordLength > 0 && passwordLength < 6;
  const isPasswordFormatValid = passwordLength >= 6;

  const confirmLength = confirmNewPassword.length;
  const isConfirmMismatch =
    confirmLength > 0 && confirmNewPassword !== newPassword;
  const isConfirmMatch =
    confirmLength > 0 &&
    confirmNewPassword === newPassword &&
    isPasswordFormatValid;

  if (isCompleted) {
    return (
      <div className="form-card">
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 12,
            background: "rgba(22, 101, 52, 0.08)",
            border: "1px solid rgba(22, 101, 52, 0.25)",
            color: "#166534",
            fontSize: "0.95rem",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#166534",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              ✓
            </span>
            <strong style={{ fontSize: "1.1rem" }}>
              Password updated successfully
            </strong>
          </div>
          <p style={{ margin: "0 0 14px 0", lineHeight: 1.5, color: "#14532d" }}>
            {completedMessage}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.925rem",
              color: "#15803d",
              fontWeight: 600,
              padding: "10px 14px",
              background: "rgba(22, 101, 52, 0.1)",
              borderRadius: 8,
              border: "1px solid rgba(22, 101, 52, 0.2)",
            }}
          >
            <span>
              Redirecting to login in <strong>{countdown}</strong> second
              {countdown === 1 ? "" : "s"}...
            </span>
          </div>
        </div>

        <button
          type="button"
          className="button button-primary"
          style={{ width: "100%", marginTop: 4 }}
          onClick={() => {
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, "/login");
            }
            router.push("/login");
            onSuccess(completedMessage);
          }}
        >
          Return to Sign in now
        </button>
      </div>
    );
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <p
        style={{
          marginTop: 0,
          marginBottom: 16,
          color: "var(--color-text-secondary)",
          fontSize: "0.95rem",
        }}
      >
        {resolvedEmail ? (
          <>
            Enter and confirm a new password for{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {resolvedEmail}
            </strong>
            .
          </>
        ) : (
          "Enter and confirm your new password below to complete your account recovery."
        )}
      </p>

      {!effectiveToken ? (
        <div>
          <p className="coupon-error-msg" style={{ marginTop: 0 }}>
            {error ||
              "Invalid or expired password recovery link. Please request a new reset link."}
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={onRequestNewLink}
          >
            Request new reset link
          </button>
          <p style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={onBackToSignIn}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                fontWeight: 600,
                color: "var(--color-primary)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to Sign in
            </button>
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label htmlFor="new-password" style={{ marginBottom: 6 }}>
              New Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-primary)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="At least 8 characters"
            minLength={8}
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            style={{
              borderColor: isPasswordFormatInvalid
                ? "#dc2626"
                : isPasswordFormatValid
                ? "#16a34a"
                : undefined,
              backgroundColor: isPasswordFormatInvalid
                ? "#fffafa"
                : isPasswordFormatValid
                ? "#f0fdf4"
                : undefined,
              boxShadow: isPasswordFormatInvalid
                ? "0 0 0 3px rgba(220, 38, 38, 0.15)"
                : isPasswordFormatValid
                ? "0 0 0 2px rgba(22, 163, 74, 0.12)"
                : undefined,
              transition:
                "border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
            }}
          />

          {isPasswordFormatInvalid && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#dc2626",
                fontSize: "0.825rem",
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: "12px", lineHeight: 1 }}>⚠</span>
              <span>
                Password must be at least 8 characters ({passwordLength}/8
                entered).
              </span>
            </div>
          )}

          {isPasswordFormatValid && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#166534",
                fontSize: "0.825rem",
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: "12px", lineHeight: 1 }}>✓</span>
              <span>Password meets minimum length requirement.</span>
            </div>
          )}

          <label
            htmlFor="confirm-new-password"
            style={{ marginTop: 14, marginBottom: 6, display: "block" }}
          >
            Confirm New Password
          </label>
          <input
            id="confirm-new-password"
            type={showPassword ? "text" : "password"}
            value={confirmNewPassword}
            onChange={(event) => {
              setConfirmNewPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Re-enter your new password"
            minLength={8}
            autoComplete="new-password"
            disabled={isSubmitting}
            required
            style={{
              borderColor: isConfirmMismatch
                ? "#dc2626"
                : isConfirmMatch
                ? "#16a34a"
                : undefined,
              backgroundColor: isConfirmMismatch
                ? "#fffafa"
                : isConfirmMatch
                ? "#f0fdf4"
                : undefined,
              boxShadow: isConfirmMismatch
                ? "0 0 0 3px rgba(220, 38, 38, 0.15)"
                : isConfirmMatch
                ? "0 0 0 2px rgba(22, 163, 74, 0.12)"
                : undefined,
              transition:
                "border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
            }}
          />

          {isConfirmMismatch && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#dc2626",
                fontSize: "0.825rem",
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: "12px", lineHeight: 1 }}>✕</span>
              <span>
                Passwords do not match. Please ensure both fields are identical.
              </span>
            </div>
          )}

          {isConfirmMatch && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#166534",
                fontSize: "0.825rem",
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: "12px", lineHeight: 1 }}>✓</span>
              <span>Passwords match.</span>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 10 }}>
              <p className="coupon-error-msg">{error}</p>
              {error.toLowerCase().includes("expired") ||
              error.toLowerCase().includes("invalid") ? (
                <button
                  type="button"
                  onClick={onRequestNewLink}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Request a new password reset link
                </button>
              ) : null}
            </div>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={
              isSubmitting || isPasswordFormatInvalid || isConfirmMismatch
            }
          >
            {isSubmitting ? "Updating password..." : "Update password"}
          </button>

          <p style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={onBackToSignIn}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                fontWeight: 600,
                color: "var(--color-primary)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to Sign in
            </button>
          </p>
        </>
      )}
    </form>
  );
}
