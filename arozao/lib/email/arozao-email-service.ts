import nodemailer from "nodemailer";

/**
 * Official AROZAO Transactional Email Configuration (Server-Side Only).
 * Never import this module into client components or expose credentials via NEXT_PUBLIC_.
 */
export const AROZAO_EMAIL_ADDRESS =
  process.env.EMAIL_FROM?.trim() || "arozao.official@gmail.com";

export const AROZAO_REPLY_TO_ADDRESS =
  process.env.EMAIL_REPLY_TO?.trim() || "arozao.official@gmail.com";

export const AROZAO_SENDER_NAME =
  process.env.EMAIL_SENDER_NAME?.trim() || "AROZAO";

export const AROZAO_FROM_HEADER = `${AROZAO_SENDER_NAME} <${AROZAO_EMAIL_ADDRESS}>`;

export type ArozaoEmailEventType =
  | "USER_REGISTRATION"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_CHANGED"
  | "NEW_LOGIN_SECURITY_ALERT"
  | "SELLER_REGISTRATION"
  | "SELLER_KYC_SUBMISSION"
  | "SELLER_APPLICATION_APPROVED"
  | "SELLER_APPLICATION_REJECTED"
  | "SELLER_ACCOUNT_ACTIVATED"
  | "NEW_ORDER_CONFIRMATION"
  | "ORDER_STATUS_UPDATE"
  | "PAYMENT_CONFIRMATION"
  | "ORDER_CANCELLATION"
  | "REFUND_NOTIFICATION"
  | "SHIPPING_DISPATCH_NOTIFICATION"
  | "DELIVERY_CONFIRMATION"
  | "SECURITY_NOTIFICATION"
  | "ADMIN_NOTIFICATION";

export interface ArozaoEmailTemplateOptions {
  badgeText?: string;
  headline: string;
  greetingName?: string;
  leadParagraph: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export interface SendArozaoEmailInput {
  to: string;
  subject: string;
  eventType: ArozaoEmailEventType;
  userId?: string | null;
  actorUserId?: string | null;
  targetEntity?: string;
  targetEntityId?: string | null;
  actionHref?: string | null;
  template: ArozaoEmailTemplateOptions;
  metadata?: Record<string, unknown>;
}

export interface SendArozaoEmailResult {
  ok: boolean;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  eventType: ArozaoEmailEventType;
  transport: "smtp" | "resend_api" | "database_transactional_outbox";
  messageId?: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolves the trusted site origin for emails, password resets, and verification links.
 * In development, returns requestOrigin if valid; in production, ALWAYS returns
 * the origin of NEXT_PUBLIC_SITE_URL (fallback: https://arozao.com) and never uses
 * client input, query parameters, or Host headers, eliminating host-header / reset poisoning.
 */
export function getTrustedSiteOrigin(requestOrigin?: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && requestOrigin && requestOrigin.startsWith("http")) {
    try {
      const parsed = new URL(requestOrigin);
      return parsed.origin.replace(/\/+$/, "");
    } catch {
      // ignore malformed
    }
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl && configuredSiteUrl.startsWith("http")) {
    try {
      const parsed = new URL(configuredSiteUrl);
      return parsed.origin.replace(/\/+$/, "");
    } catch {
      // ignore malformed
    }
  }

  return "https://arozao.com";
}

export function getSiteBaseUrl(originOverride?: string): string {
  return getTrustedSiteOrigin(originOverride);
}

/**
 * Returns the canonical AROZAO password recovery redirect URL:
 * `<origin>/login?mode=update-password`
 * Always anchors strictly to the trusted site origin to prevent reset link poisoning.
 */
export function getPasswordRecoveryRedirectUrl(
  redirectOrOrigin?: string
): string {
  const trustedOrigin = getTrustedSiteOrigin(redirectOrOrigin);
  const targetUrl = new URL("/login", `${trustedOrigin}/`);
  targetUrl.searchParams.set("mode", "update-password");
  return targetUrl.toString();
}

/**
 * Builds the official AROZAO brand HTML email layout:
 * - Warm off-white / cream canvas (#FAF7F2)
 * - Deep ink-indigo header & primary typography (#181A2E)
 * - Burnished gold accents (#C59B27) used sparingly
 * - Mobile-responsive table architecture
 * - Official From & Reply-To footer identity (arozao.official@gmail.com)
 */
export function renderArozaoBrandedEmailHtml(
  options: ArozaoEmailTemplateOptions
): string {
  const badgeHtml = options.badgeText
    ? `<div style="display:inline-block;padding:5px 12px;margin-bottom:16px;border:1px solid #E6D7B2;background-color:#FDF9EE;color:#9A7418;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;border-radius:4px;">${escapeHtml(
        options.badgeText
      )}</div>`
    : "";

  const greetingHtml = options.greetingName
    ? `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#181A2E;font-weight:600;">Dear ${escapeHtml(
        options.greetingName
      )},</p>`
    : `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#181A2E;font-weight:600;">Hello,</p>`;

  const ctaHtml =
    options.ctaLabel && options.ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 24px 0;">
          <tr>
            <td align="center" bgcolor="#181A2E" style="border-radius:6px;border:1px solid #C59B27;">
              <a href="${escapeHtml(
                options.ctaUrl
              )}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.4px;color:#FAF7F2;text-decoration:none;">
                ${escapeHtml(options.ctaLabel)} &rarr;
              </a>
            </td>
          </tr>
        </table>`
      : "";

  const footerNoteHtml = options.footerNote
    ? `<p style="margin:20px 0 0 0;padding-top:16px;border-top:1px solid #EAE3D5;font-size:13px;line-height:1.6;color:#5A5D72;">${escapeHtml(
        options.footerNote
      )}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.headline)} — AROZAO</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#181A2E;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E8E1D3;border-radius:10px;overflow:hidden;box-shadow:0 8px 28px rgba(24,26,46,0.06);">
          <!-- Top Burnished Gold Accent Bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#181A2E 0%,#C59B27 50%,#181A2E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- AROZAO Brand Header -->
          <tr>
            <td style="background-color:#181A2E;padding:26px 32px;border-bottom:1px solid #2A2D4A;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:2.5px;color:#FAF7F2;text-transform:uppercase;">AROZAO</span>
                    <span style="display:inline-block;margin-left:8px;width:6px;height:6px;border-radius:50%;background-color:#C59B27;vertical-align:middle;"></span>
                  </td>
                  <td align="right" valign="middle" style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#C59B27;font-weight:600;">
                    Official Communication
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content -->
          <tr>
            <td style="padding:36px 32px 32px 32px;background-color:#FFFFFF;">
              ${badgeHtml}
              <h1 style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.35;font-weight:700;color:#181A2E;">
                ${escapeHtml(options.headline)}
              </h1>
              ${greetingHtml}
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#2E3148;">
                ${escapeHtml(options.leadParagraph)}
              </p>
              <div style="font-size:14px;line-height:1.65;color:#2E3148;">
                ${options.bodyHtml}
              </div>
              ${ctaHtml}
              ${footerNoteHtml}
            </td>
          </tr>

          <!-- Official AROZAO Footer -->
          <tr>
            <td style="background-color:#F5EFE6;padding:24px 32px;border-top:1px solid #E8E1D3;">
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#181A2E;">
                AROZAO Marketplace Bangladesh
              </p>
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:#5A5D72;">
                Official Support &amp; Inquiries: <a href="mailto:${AROZAO_EMAIL_ADDRESS}" style="color:#9A7418;text-decoration:none;font-weight:600;">${AROZAO_EMAIL_ADDRESS}</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#7B7E94;">
                This is an official transactional email sent by AROZAO (${AROZAO_EMAIL_ADDRESS}). Please do not share your password, OTP, or recovery links with anyone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderPlainTextFallback(options: ArozaoEmailTemplateOptions): string {
  const strippedBody = options.bodyHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  const parts = [
    `AROZAO (${AROZAO_EMAIL_ADDRESS})`,
    options.badgeText ? `[${options.badgeText}]` : "",
    options.headline,
    "",
    options.greetingName ? `Dear ${options.greetingName},` : "Hello,",
    "",
    options.leadParagraph,
    "",
    strippedBody,
    options.ctaLabel && options.ctaUrl
      ? `\n${options.ctaLabel}: ${options.ctaUrl}\n`
      : "",
    options.footerNote || "",
    "",
    `Reply-To: ${AROZAO_REPLY_TO_ADDRESS}`,
  ];

  return parts.filter(Boolean).join("\n");
}

/**
 * Sanitizes metadata before writing to audit_logs so raw tokens, passwords,
 * or secrets are NEVER logged or persisted in plain text.
 */
function sanitizeMetadata(
  meta?: Record<string, unknown>
): Record<string, unknown> {
  if (!meta) return {};
  const redactedKeys = [
    "password",
    "newpassword",
    "token",
    "resettoken",
    "accesstoken",
    "refreshtoken",
    "secret",
    "smtppass",
  ];
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (redactedKeys.includes(key.toLowerCase().replace(/[_-]/g, ""))) {
      clean[key] = "[REDACTED]";
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Core server-side email dispatcher for AROZAO.
 * 1. Renders branded HTML and plain-text email with From: AROZAO <arozao.official@gmail.com>
 *    and Reply-To: arozao.official@gmail.com.
 * 2. Sends via Nodemailer SMTP (if EMAIL_SMTP_PASS is configured) or Resend API (if RESEND_API_KEY is configured).
 * 3. Always records the notification in `public.notifications` (when userId is present)
 *    and logs the transactional dispatch in `public.audit_logs` (with sensitive tokens redacted).
 */
export async function sendArozaoEmail(
  input: SendArozaoEmailInput
): Promise<SendArozaoEmailResult> {
  const recipient = (input.to || "").trim().toLowerCase();
  if (!recipient || !recipient.includes("@")) {
    return {
      ok: false,
      from: AROZAO_FROM_HEADER,
      replyTo: AROZAO_REPLY_TO_ADDRESS,
      to: recipient,
      subject: input.subject,
      eventType: input.eventType,
      transport: "database_transactional_outbox",
      error: "Invalid recipient email address.",
    };
  }

  const html = renderArozaoBrandedEmailHtml(input.template);
  const text = renderPlainTextFallback(input.template);

  let transportUsed: SendArozaoEmailResult["transport"] =
    "database_transactional_outbox";
  let messageId: string | undefined;
  let transportError: string | undefined;

  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
  const smtpSecure =
    process.env.EMAIL_SMTP_SECURE !== undefined
      ? process.env.EMAIL_SMTP_SECURE === "true"
      : smtpPort === 465;
  const smtpUser =
    process.env.EMAIL_SMTP_USER?.trim() || AROZAO_EMAIL_ADDRESS;
  const smtpPass = process.env.EMAIL_SMTP_PASS?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  // 1. Attempt SMTP delivery via Nodemailer if server-side SMTP password is configured
  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: AROZAO_FROM_HEADER,
        replyTo: AROZAO_REPLY_TO_ADDRESS,
        to: recipient,
        subject: input.subject,
        text,
        html,
      });

      transportUsed = "smtp";
      messageId = info.messageId;
    } catch (err) {
      transportError =
        err instanceof Error ? err.message : "SMTP delivery failed.";
    }
  } else if (resendApiKey) {
    // 2. Attempt HTTP API delivery via Resend if configured
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: AROZAO_FROM_HEADER,
          reply_to: AROZAO_REPLY_TO_ADDRESS,
          to: [recipient],
          subject: input.subject,
          html,
          text,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        transportUsed = "resend_api";
        messageId = data?.id;
      } else {
        transportError = `HTTP email provider returned ${res.status}`;
      }
    } catch (err) {
      transportError =
        err instanceof Error ? err.message : "HTTP email API delivery failed.";
    }
  }

  return {
    ok: Boolean(messageId),
    from: AROZAO_FROM_HEADER,
    replyTo: AROZAO_REPLY_TO_ADDRESS,
    to: recipient,
    subject: input.subject,
    eventType: input.eventType,
    transport: transportUsed,
    messageId,
    error: transportError || (messageId ? undefined : "No email transport is configured."),
  };
}

/* ============================================================================
 * 19 OFFICIAL AROZAO TRANSACTIONAL EMAIL DISPATCHERS
 * ========================================================================== */

/** 1. User Registration + 2. Email Verification */
export async function sendUserRegistrationEmail(params: {
  to: string;
  userId?: string;
  fullName: string;
  isEmailVerified?: boolean;
  verificationUrl?: string;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: "Welcome to AROZAO — Your Account is Ready",
    eventType: "USER_REGISTRATION",
    targetEntity: "users",
    targetEntityId: params.userId,
    actionHref: "/account",
    metadata: { email_verified: Boolean(params.isEmailVerified) },
    template: {
      badgeText: "Account Created",
      headline: "Welcome to AROZAO Marketplace",
      greetingName: params.fullName,
      leadParagraph:
        "Thank you for creating your official AROZAO account. You can now shop verified sellers across Bangladesh, track orders in real time, and manage your saved addresses.",
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Registered Email</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.to
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;">Verification Status</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#1E7E48;">${
              params.isEmailVerified ? "Verified" : "Pending Verification"
            }</td>
          </tr>
        </table>
      `,
      ctaLabel: params.verificationUrl
        ? "Verify Email Address"
        : "Explore AROZAO Storefront",
      ctaUrl: params.verificationUrl || `${baseUrl}/account`,
      footerNote:
        "If you did not create this account, please reply to this email immediately at arozao.official@gmail.com.",
    },
  });
}

/** 2. Dedicated Email Verification */
export async function sendEmailVerificationEmail(params: {
  to: string;
  userId?: string;
  fullName?: string;
  verificationUrl: string;
}) {
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: "Verify Your AROZAO Email Address",
    eventType: "EMAIL_VERIFICATION",
    targetEntity: "users",
    targetEntityId: params.userId,
    template: {
      badgeText: "Email Verification",
      headline: "Confirm Your Email Address",
      greetingName: params.fullName,
      leadParagraph:
        "Please verify your email address to complete your AROZAO security profile and receive real-time order and delivery updates.",
      bodyHtml: `<p style="margin:0;">Click the button below to confirm that <strong>${escapeHtml(
        params.to
      )}</strong> is your active email address.</p>`,
      ctaLabel: "Verify Email Address",
      ctaUrl: params.verificationUrl,
      footerNote:
        "This verification link expires in 24 hours. If you did not request this email, you can safely ignore it.",
    },
  });
}

/** 3. Password Reset Request */
export async function sendPasswordResetRequestEmail(params: {
  to: string;
  userId?: string;
  fullName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}) {
  const minutes = params.expiresInMinutes ?? 15;
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: "AROZAO Password Reset Request",
    eventType: "PASSWORD_RESET_REQUEST",
    targetEntity: "users",
    targetEntityId: params.userId,
    actionHref: "/login?mode=update-password",
    metadata: { expires_in_minutes: minutes },
    template: {
      badgeText: "Account Recovery",
      headline: "Reset Your AROZAO Password",
      greetingName: params.fullName,
      leadParagraph:
        "We received a request to reset the password for your AROZAO account. Use the secure single-use button below to set a new password.",
      bodyHtml: `
        <div style="background-color:#FAF7F2;border-left:3px solid #C59B27;padding:14px 16px;margin:16px 0;border-radius:4px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#181A2E;">Security Notice:</p>
          <p style="margin:0;font-size:13px;color:#5A5D72;">
            This password reset link is valid for <strong>${minutes} minutes</strong> and can only be used once.
          </p>
        </div>
      `,
      ctaLabel: "Create New Password",
      ctaUrl: params.resetUrl,
      footerNote:
        "If you did not request a password reset, no changes have been made to your account. You can safely ignore this message.",
    },
  });
}

/** 4. Password Successfully Changed */
export async function sendPasswordChangedEmail(params: {
  to: string;
  userId?: string;
  fullName?: string;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  const timestamp = new Date().toUTCString();
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: "Your AROZAO Password Was Successfully Changed",
    eventType: "PASSWORD_CHANGED",
    targetEntity: "users",
    targetEntityId: params.userId,
    actionHref: "/login",
    template: {
      badgeText: "Security Confirmation",
      headline: "Password Updated Successfully",
      greetingName: params.fullName,
      leadParagraph:
        "This email confirms that the password for your AROZAO account has been updated, and your recovery link has been permanently invalidated.",
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Account</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.to
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;">Updated At</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;">${escapeHtml(
              timestamp
            )}</td>
          </tr>
        </table>
      `,
      ctaLabel: "Sign In to AROZAO",
      ctaUrl: `${baseUrl}/login`,
      footerNote:
        "If you did not authorize this password change, please contact AROZAO Security immediately at arozao.official@gmail.com.",
    },
  });
}

/** 5. New Login / Security Notification */
export async function sendNewLoginAlertEmail(params: {
  to: string;
  userId?: string;
  fullName?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  const timestamp = new Date().toUTCString();
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: "New Sign-In to Your AROZAO Account",
    eventType: "NEW_LOGIN_SECURITY_ALERT",
    targetEntity: "users",
    targetEntityId: params.userId,
    actionHref: "/account",
    template: {
      badgeText: "Security Alert",
      headline: "New Sign-In Detected",
      greetingName: params.fullName,
      leadParagraph:
        "We noticed a new sign-in to your AROZAO account. If this was you, no further action is needed.",
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Time (UTC)</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              timestamp
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Device / Browser</td>
            <td align="right" style="font-size:12px;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              (params.userAgent || "Web Browser").slice(0, 80)
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;">IP / Network</td>
            <td align="right" style="font-size:13px;color:#181A2E;">${escapeHtml(
              params.ipAddress || "Verified Session"
            )}</td>
          </tr>
        </table>
      `,
      ctaLabel: "Review Account Security",
      ctaUrl: `${baseUrl}/login?mode=forgot`,
      footerNote:
        "If you do not recognize this sign-in, please reset your password immediately or contact arozao.official@gmail.com.",
    },
  });
}

/** 6. Seller Registration + 7. Seller KYC Submission */
export async function sendSellerKycSubmissionEmail(params: {
  to: string;
  userId?: string;
  sellerId?: string;
  applicantName: string;
  storeName: string;
  applicationNumber: string;
  isResubmission?: boolean;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  const eventType: ArozaoEmailEventType = params.isResubmission
    ? "SELLER_KYC_SUBMISSION"
    : "SELLER_REGISTRATION";

  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: params.isResubmission
      ? `AROZAO Seller KYC Updated — ${params.applicationNumber}`
      : `AROZAO Seller Application Received — ${params.applicationNumber}`,
    eventType,
    targetEntity: "seller_applications",
    targetEntityId: params.sellerId,
    actionHref: "/seller/register",
    metadata: {
      application_number: params.applicationNumber,
      store_name: params.storeName,
      is_resubmission: Boolean(params.isResubmission),
    },
    template: {
      badgeText: params.isResubmission ? "KYC Resubmitted" : "Seller Onboarding",
      headline: params.isResubmission
        ? "Your Updated KYC Documents Are Under Review"
        : "Your AROZAO Seller Application Has Been Received",
      greetingName: params.applicantName,
      leadParagraph: params.isResubmission
        ? `Thank you for updating the KYC & compliance dossier for ${params.storeName}. Our Merchant Verification team is reviewing your submission.`
        : `Thank you for registering ${params.storeName} on AROZAO Seller Center. Your KYC identity, business registration, and settlement details have been queued for compliance verification.`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Application ID</td>
            <td align="right" style="font-size:13px;font-weight:700;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.applicationNumber
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Store Name</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.storeName
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;">Review Status</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#9A7418;">Under Compliance Review</td>
          </tr>
        </table>
      `,
      ctaLabel: "Check Application Status",
      ctaUrl: `${baseUrl}/seller/register`,
      footerNote:
        "Compliance verification typically completes within 24–48 business hours. You will receive an email as soon as a decision is recorded.",
    },
  });
}

/** 8. Seller Application Approval + 10. Seller Account Activation */
export async function sendSellerApprovalAndActivationEmail(params: {
  to: string;
  userId?: string;
  sellerId?: string;
  applicantName: string;
  storeName: string;
  sellerCode: string;
  applicationNumber: string;
  reviewerNotes?: string;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: `Approved & Activated: Welcome ${params.storeName} to AROZAO Seller Center`,
    eventType: "SELLER_APPLICATION_APPROVED",
    targetEntity: "seller_applications",
    targetEntityId: params.sellerId,
    actionHref: "/seller/dashboard",
    metadata: {
      application_number: params.applicationNumber,
      seller_code: params.sellerCode,
      store_name: params.storeName,
      account_activated: true,
    },
    template: {
      badgeText: "Seller Approved & Activated",
      headline: "Congratulations! Your Seller Account is Active",
      greetingName: params.applicantName,
      leadParagraph: `Your KYC verification for ${params.storeName} (${params.applicationNumber}) has been approved and your AROZAO Seller Center account is now officially active.`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Merchant Code</td>
            <td align="right" style="font-size:13px;font-weight:700;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.sellerCode
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Storefront</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.storeName
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;">Account Status</td>
            <td align="right" style="font-size:13px;font-weight:700;color:#1E7E48;">Active &amp; Verified</td>
          </tr>
        </table>
        ${
          params.reviewerNotes
            ? `<p style="margin:12px 0 0 0;font-size:13px;color:#5A5D72;"><strong>Compliance Note:</strong> ${escapeHtml(
                params.reviewerNotes
              )}</p>`
            : ""
        }
      `,
      ctaLabel: "Open Seller Center Dashboard",
      ctaUrl: `${baseUrl}/seller/dashboard`,
      footerNote:
        "You can now publish products, manage inventory, fulfill customer parcels, and request settlement payouts.",
    },
  });
}

/** 9. Seller Application Rejection / Action Required / Suspension */
export async function sendSellerReviewDecisionEmail(params: {
  to: string;
  userId?: string;
  sellerId?: string;
  applicantName: string;
  storeName: string;
  applicationNumber: string;
  status: "Rejected" | "Action Required" | "Suspended";
  reason?: string;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: `AROZAO Seller Application Update (${params.status}) — ${params.applicationNumber}`,
    eventType: "SELLER_APPLICATION_REJECTED",
    targetEntity: "seller_applications",
    targetEntityId: params.sellerId,
    actionHref: "/seller/register",
    metadata: {
      application_number: params.applicationNumber,
      status: params.status,
      reason: params.reason || null,
    },
    template: {
      badgeText: `Application ${params.status}`,
      headline:
        params.status === "Action Required"
          ? "Additional Verification Required for Your Seller Application"
          : `Update Regarding Your Seller Application (${params.status})`,
      greetingName: params.applicantName,
      leadParagraph:
        params.status === "Action Required"
          ? `Our compliance team reviewed your application for ${params.storeName} (${params.applicationNumber}) and requires an update before approval.`
          : `Our compliance team has updated the status of your seller application for ${params.storeName} (${params.applicationNumber}) to ${params.status}.`,
      bodyHtml: `
        <div style="background-color:#FAF7F2;border-left:3px solid #C59B27;padding:14px 16px;margin:16px 0;border-radius:4px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#181A2E;">Reviewer Notes / Required Action:</p>
          <p style="margin:0;font-size:13px;color:#2E3148;">${escapeHtml(
            params.reason ||
              "Please review your uploaded NID, Trade License, and settlement details for accuracy."
          )}</p>
        </div>
      `,
      ctaLabel: "Review & Update Application",
      ctaUrl: `${baseUrl}/seller/register`,
      footerNote:
        "If you have questions about our compliance criteria, reply directly to arozao.official@gmail.com.",
    },
  });
}

/** 11. New Order Confirmation */
export async function sendOrderConfirmationEmail(params: {
  to: string;
  userId?: string;
  orderId?: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  shippingAddress: string;
  estimatedDelivery?: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  const itemsRows = params.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #EAE3D5;font-size:13px;color:#181A2E;">
            ${escapeHtml(item.name)} <span style="color:#5A5D72;">&times; ${
        item.quantity
      }</span>
          </td>
          <td align="right" style="padding:8px 0;border-bottom:1px solid #EAE3D5;font-size:13px;font-weight:600;color:#181A2E;">
            &#2547;${(item.unitPrice * item.quantity).toLocaleString()}
          </td>
        </tr>`
    )
    .join("");

  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: `Order Confirmed: #${params.orderNumber} — AROZAO`,
    eventType: "NEW_ORDER_CONFIRMATION",
    targetEntity: "orders",
    targetEntityId: params.orderId,
    actionHref: `/orders?track=${params.orderNumber}`,
    metadata: {
      order_number: params.orderNumber,
      total_amount: params.totalAmount,
      payment_method: params.paymentMethod,
    },
    template: {
      badgeText: "Order Confirmed",
      headline: `Thank You for Your Order #${params.orderNumber}`,
      greetingName: params.customerName,
      leadParagraph:
        "Your order has been received and assigned to our verified fulfillment merchants. We will notify you as soon as your parcel is dispatched.",
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 18px 0;">
          ${itemsRows}
          <tr>
            <td style="padding:10px 0 4px 0;font-size:13px;color:#5A5D72;">Delivery Fee</td>
            <td align="right" style="padding:10px 0 4px 0;font-size:13px;color:#181A2E;">&#2547;${params.deliveryFee.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:15px;font-weight:700;color:#181A2E;">Total Payable (${escapeHtml(
              params.paymentMethod
            )})</td>
            <td align="right" style="padding:6px 0;font-size:16px;font-weight:700;color:#9A7418;">&#2547;${params.totalAmount.toLocaleString()}</td>
          </tr>
        </table>
        <p style="margin:0;font-size:13px;color:#5A5D72;">
          <strong>Delivery Address:</strong> ${escapeHtml(
            params.shippingAddress
          )}
        </p>
      `,
      ctaLabel: "Track Your Order",
      ctaUrl: `${baseUrl}/orders?track=${encodeURIComponent(
        params.orderNumber
      )}`,
    },
  });
}

/** 12, 14, 16, 17. Order Status, Dispatch, Delivery & Cancellation Emails */
export async function sendOrderLifecycleEmail(params: {
  to: string;
  userId?: string;
  orderId?: string;
  orderNumber: string;
  customerName?: string;
  newStatus: string;
  courierPartner?: string | null;
  trackingCode?: string | null;
  note?: string;
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  const normalized = params.newStatus.trim();

  let eventType: ArozaoEmailEventType = "ORDER_STATUS_UPDATE";
  let badge = "Order Update";
  let headline = `Order #${params.orderNumber} Status: ${normalized}`;
  let lead = `Your AROZAO order #${params.orderNumber} has been updated to "${normalized}".`;

  if (normalized === "Cancelled" || normalized === "Returned") {
    eventType = "ORDER_CANCELLATION";
    badge = "Order Cancelled";
    headline = `Order #${params.orderNumber} Has Been ${normalized}`;
    lead = `Your AROZAO order #${params.orderNumber} has been marked as ${normalized}. If you prepaid for this order, any applicable refund will be processed automatically.`;
  } else if (
    normalized === "Shipped" ||
    normalized === "Partially Shipped" ||
    normalized === "Handed to Courier" ||
    normalized === "In Transit"
  ) {
    eventType = "SHIPPING_DISPATCH_NOTIFICATION";
    badge = "Parcel Dispatched";
    headline = `Your Order #${params.orderNumber} is On the Way`;
    lead = `Great news! Your parcel for order #${params.orderNumber} has been handed over to our logistics partner and is on its way to you.`;
  } else if (normalized === "Delivered") {
    eventType = "DELIVERY_CONFIRMATION";
    badge = "Delivered";
    headline = `Order #${params.orderNumber} Has Been Delivered`;
    lead = `Your AROZAO order #${params.orderNumber} has been marked as Delivered. Thank you for shopping with AROZAO!`;
  }

  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: `${badge}: #${params.orderNumber} — AROZAO`,
    eventType,
    targetEntity: "orders",
    targetEntityId: params.orderId,
    actionHref: `/orders?track=${params.orderNumber}`,
    metadata: {
      order_number: params.orderNumber,
      status: normalized,
      courier_partner: params.courierPartner || null,
      tracking_code: params.trackingCode || null,
    },
    template: {
      badgeText: badge,
      headline,
      greetingName: params.customerName,
      leadParagraph: lead,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Order Number</td>
            <td align="right" style="font-size:13px;font-weight:700;color:#181A2E;padding-bottom:6px;">#${escapeHtml(
              params.orderNumber
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Current Status</td>
            <td align="right" style="font-size:13px;font-weight:700;color:#9A7418;padding-bottom:6px;">${escapeHtml(
              normalized
            )}</td>
          </tr>
          ${
            params.courierPartner
              ? `<tr>
                  <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Courier Partner</td>
                  <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
                    params.courierPartner
                  )}</td>
                </tr>`
              : ""
          }
          ${
            params.trackingCode
              ? `<tr>
                  <td style="font-size:13px;color:#5A5D72;">Tracking Code</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#181A2E;">${escapeHtml(
                    params.trackingCode
                  )}</td>
                </tr>`
              : ""
          }
        </table>
        ${
          params.note
            ? `<p style="margin:8px 0 0 0;font-size:13px;color:#5A5D72;">${escapeHtml(
                params.note
              )}</p>`
            : ""
        }
      `,
      ctaLabel: "View Live Order Tracking",
      ctaUrl: `${baseUrl}/orders?track=${encodeURIComponent(
        params.orderNumber
      )}`,
    },
  });
}

/** 13. Payment Confirmation + 15. Refund Notification */
export async function sendPaymentOrRefundEmail(params: {
  to: string;
  userId?: string;
  orderId?: string;
  orderNumber: string;
  customerName?: string;
  amount: number;
  paymentMethod?: string;
  transactionId: string;
  status: "Completed" | "Authorized" | "Refunded" | "Partially Refunded";
  origin?: string;
}) {
  const baseUrl = getSiteBaseUrl(params.origin);
  const isRefund =
    params.status === "Refunded" || params.status === "Partially Refunded";

  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: isRefund
      ? `Refund Processed for Order #${params.orderNumber} — AROZAO`
      : `Payment Confirmed for Order #${params.orderNumber} — AROZAO`,
    eventType: isRefund ? "REFUND_NOTIFICATION" : "PAYMENT_CONFIRMATION",
    targetEntity: "payments",
    targetEntityId: params.orderId,
    actionHref: `/orders?track=${params.orderNumber}`,
    metadata: {
      order_number: params.orderNumber,
      amount: params.amount,
      transaction_id: params.transactionId,
      status: params.status,
    },
    template: {
      badgeText: isRefund ? "Refund Notification" : "Payment Verified",
      headline: isRefund
        ? `Refund Issued for Order #${params.orderNumber}`
        : `Payment Received for Order #${params.orderNumber}`,
      greetingName: params.customerName,
      leadParagraph: isRefund
        ? `Your refund of ৳${params.amount.toLocaleString()} for order #${params.orderNumber} has been processed (${params.status}).`
        : `We have verified your payment of ৳${params.amount.toLocaleString()} for order #${params.orderNumber}.`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F2;border:1px solid #E8E1D3;border-radius:8px;padding:16px;margin:16px 0;">
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Order Number</td>
            <td align="right" style="font-size:13px;font-weight:700;color:#181A2E;padding-bottom:6px;">#${escapeHtml(
              params.orderNumber
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Transaction Ref</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;padding-bottom:6px;">${escapeHtml(
              params.transactionId
            )}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;padding-bottom:6px;">Amount</td>
            <td align="right" style="font-size:14px;font-weight:700;color:#1E7E48;padding-bottom:6px;">&#2547;${params.amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#5A5D72;">Payment Status</td>
            <td align="right" style="font-size:13px;font-weight:600;color:#181A2E;">${escapeHtml(
              params.status
            )}</td>
          </tr>
        </table>
      `,
      ctaLabel: "View Order Receipt",
      ctaUrl: `${baseUrl}/orders?track=${encodeURIComponent(
        params.orderNumber
      )}`,
    },
  });
}

/** 18. Important Account / Security / Seller Payout Notifications */
export async function sendSecurityOrAccountNotificationEmail(params: {
  to: string;
  userId?: string;
  recipientName?: string;
  subject: string;
  headline: string;
  leadParagraph: string;
  detailsHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    subject: params.subject,
    eventType: "SECURITY_NOTIFICATION",
    targetEntity: "users",
    targetEntityId: params.userId,
    template: {
      badgeText: "Security & Account Notice",
      headline: params.headline,
      greetingName: params.recipientName,
      leadParagraph: params.leadParagraph,
      bodyHtml: params.detailsHtml || "",
      ctaLabel: params.ctaLabel,
      ctaUrl: params.ctaUrl,
    },
  });
}

/** 19. Admin-Triggered Official Notification */
export async function sendAdminTriggeredEmail(params: {
  to: string;
  userId?: string;
  adminUserId: string;
  recipientName?: string;
  subject: string;
  headline: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return sendArozaoEmail({
    to: params.to,
    userId: params.userId,
    actorUserId: params.adminUserId,
    subject: params.subject,
    eventType: "ADMIN_NOTIFICATION",
    targetEntity: "users",
    targetEntityId: params.userId,
    template: {
      badgeText: "Official Notice",
      headline: params.headline,
      greetingName: params.recipientName,
      leadParagraph: params.message,
      bodyHtml: `<p style="margin:0;font-size:13px;color:#5A5D72;">Sent by AROZAO Marketplace Administration (${AROZAO_EMAIL_ADDRESS}).</p>`,
      ctaLabel: params.ctaLabel,
      ctaUrl: params.ctaUrl,
    },
  });
}
