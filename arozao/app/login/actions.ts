"use server";

import { headers } from "next/headers";
import {
  getTrustedSiteOrigin,
  sendPasswordChangedEmail,
} from "@/lib/email/arozao-email-service";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

function requestIp(): string {
  const requestHeaders = headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

export interface PasswordResetActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function requestPasswordResetAction(input: {
  email: string;
  redirectTo?: string;
}): Promise<PasswordResetActionResult> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const rate = checkRateLimit(`forgot-pw:${requestIp()}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return { ok: false, error: "Too many password recovery requests. Please try again later." };
  }

  try {
    return await requestPasswordReset(email, input.redirectTo);
  } catch (error) {
    console.error("[Password reset] Request failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to process password reset request.",
    };
  }
}

export async function updatePasswordWithRecoveryAction(input: {
  recoveryToken: string;
  tokenType?: "single_use";
  email?: string;
  newPassword: string;
  origin?: string;
}): Promise<PasswordResetActionResult> {
  const token = (input.recoveryToken || "").trim();
  if (!token) return { ok: false, error: "Missing or expired password recovery token." };
  if (input.newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters long." };
  }
  const rate = checkRateLimit(`password-reset:${requestIp()}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    return { ok: false, error: "Too many password reset attempts. Please try again later." };
  }

  try {
    const result = await resetPassword({ token, newPassword: input.newPassword });
    const user = result.data;
    if (user?.email) {
      try {
        await sendPasswordChangedEmail({
          to: user.email,
          userId: user.userId,
          fullName: user.fullName,
          origin: getTrustedSiteOrigin(input.origin),
        });
      } catch (error) {
        console.error("[Password reset] Confirmation email failed:", error);
      }
    }
    return {
      ok: true,
      message: "Your password has been updated successfully. You can now sign in with your new password.",
    };
  } catch (error) {
    console.error("[Password reset] Update failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update password.",
    };
  }
}
