import "server-only";
import {
  getPasswordRecoveryRedirectUrl,
  getTrustedSiteOrigin,
  sendPasswordResetRequestEmail,
} from "@/lib/email/arozao-email-service";

const DEFAULT_PHP_API_URL = "http://localhost/Arozao%20Website/api";

type PhpResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

async function readPhpResponse<T>(response: Response): Promise<PhpResult<T>> {
  let result: PhpResult<T>;
  try {
    result = (await response.json()) as PhpResult<T>;
  } catch {
    throw new Error("The PHP backend returned an invalid response.");
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || "The PHP backend could not process the request.");
  }
  return result;
}

export async function requestPasswordReset(email: string, requestOrigin?: string) {
  const internalKey = process.env.PHP_INTERNAL_KEY?.trim();
  if (!internalKey) {
    throw new Error("Password reset delivery is not configured. Set PHP_INTERNAL_KEY for Next.js and PHP.");
  }
  const baseUrl = (process.env.PHP_API_URL || DEFAULT_PHP_API_URL).replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/auth/password-reset-token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Internal-Key": internalKey,
    },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    cache: "no-store",
  });
  const result = await readPhpResponse<{
    found: boolean;
    token?: string;
    userId?: string;
    fullName?: string;
    email?: string;
    expiresInMinutes?: number;
  }>(response);
  if (!result.data) throw new Error("The PHP backend returned no password reset status.");

  if (result.data.found) {
    if (!result.data.token || !result.data.email) {
      throw new Error("The PHP backend returned incomplete password reset details.");
    }
    const origin = getTrustedSiteOrigin(requestOrigin);
    const resetUrl = new URL(getPasswordRecoveryRedirectUrl(origin));
    resetUrl.searchParams.set("token", result.data.token);
    resetUrl.searchParams.set("email", result.data.email);
    const delivery = await sendPasswordResetRequestEmail({
      to: result.data.email,
      userId: result.data.userId,
      fullName: result.data.fullName,
      resetUrl: resetUrl.toString(),
      expiresInMinutes: result.data.expiresInMinutes || 15,
    });
    if (!delivery.ok) {
      throw new Error(delivery.error || "Password reset email could not be delivered.");
    }
  }

  return {
    ok: true as const,
    message:
      "If an Arozao account is registered with that email address, we have sent a password reset link. Please check your inbox and spam folder.",
  };
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}) {
  const baseUrl = (process.env.PHP_API_URL || DEFAULT_PHP_API_URL).replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/auth/reset-password`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      token: input.token,
      password: input.newPassword,
      password_confirmation: input.newPassword,
    }),
    cache: "no-store",
  });
  return readPhpResponse<{
    userId: string;
    email: string;
    fullName: string;
  }>(response);
}
