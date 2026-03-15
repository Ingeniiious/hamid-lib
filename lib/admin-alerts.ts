// ---------------------------------------------------------------------------
// Admin Alerts — Email Hamid when critical billing/quota errors occur
//
// Deduplicates alerts: same alert type only fires once per hour (in-memory).
// Uses AutoSend via lib/email.ts.
// ---------------------------------------------------------------------------

import { sendEmail } from "@/lib/email";
import { dispatchNotification } from "@/lib/notification-dispatch";

// ── Admin account (in-app + push + email) ───────────────────────────────────

const ADMIN_USER_ID = "5af4d10d-5749-478a-b107-233365aabff4"; // 100khosravi79@gmail.com
const ADMIN_EMAILS = ["hello@libraryyy.com", "Sadkhosravi79@outlook.com"];

// ── Deduplication — one alert per type per hour ─────────────────────────────

const recentAlerts = new Map<string, number>();
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function shouldSend(alertKey: string): boolean {
  const lastSent = recentAlerts.get(alertKey);
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    return false;
  }
  recentAlerts.set(alertKey, Date.now());
  return true;
}

// ── Billing error patterns ──────────────────────────────────────────────────

const BILLING_ERROR_PATTERNS = [
  "insufficient_quota",
  "insufficient_funds",
  "billing",
  "payment",
  "quota_exceeded",
  "rate_limit_exceeded",
  "budget",
  "credit",
  "exceeded your current quota",
  "account.*deactivated",
  "account.*suspended",
  "plan.*limit",
  "spending.*limit",
  "402",
];

/** Check if an error message indicates a billing/credit issue. */
export function isBillingError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return BILLING_ERROR_PATTERNS.some((p) => new RegExp(p).test(lower));
}

// ── Alert sender ────────────────────────────────────────────────────────────

export async function alertAdmin({
  subject,
  provider,
  errorMessage,
  context,
}: {
  subject: string;
  provider: string;
  errorMessage: string;
  context?: Record<string, string | number | undefined>;
}) {
  const alertKey = `${provider}:${subject}`;
  if (!shouldSend(alertKey)) {
    console.log(`[admin-alert] Suppressed duplicate: ${alertKey}`);
    return;
  }

  const contextRows = context
    ? Object.entries(context)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888;">${k}</td><td style="padding:4px 0;">${v}</td></tr>`)
        .join("")
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:16px;">
        <h2 style="margin:0 0 8px;color:#991b1b;font-size:18px;">API Credit Alert</h2>
        <p style="margin:0;color:#b91c1c;font-size:14px;">${subject}</p>
      </div>
      <table style="font-size:14px;color:#333;width:100%;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Provider</td><td style="padding:4px 0;font-weight:600;">${provider}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Error</td><td style="padding:4px 0;">${errorMessage.slice(0, 500)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Time</td><td style="padding:4px 0;">${new Date().toISOString()}</td></tr>
        ${contextRows}
      </table>
      <p style="margin-top:20px;font-size:12px;color:#999;">
        This alert fires at most once per hour per provider/error type.
        Check your API dashboard immediately.
      </p>
    </div>
  `;

  const text = `API Credit Alert: ${subject}\nProvider: ${provider}\nError: ${errorMessage.slice(0, 500)}\nTime: ${new Date().toISOString()}`;

  // ── In-app + push notification (PWA) ──────────────────────────────────
  try {
    await dispatchNotification(ADMIN_USER_ID, {
      category: "system",
      title: `API Alert: ${provider}`,
      body: errorMessage.slice(0, 200),
      url: "/admin/ai-council",
      metadata: { provider, alertKey, ...context },
    });
    console.log(`[admin-alert] In-app notification sent: ${alertKey}`);
  } catch (err) {
    console.error(`[admin-alert] In-app notification error: ${(err as Error).message}`);
  }

  // ── Email alerts ──────────────────────────────────────────────────────
  for (const email of ADMIN_EMAILS) {
    try {
      const result = await sendEmail({
        to: email,
        subject: `[Libraryyy Alert] ${subject}`,
        html,
        text,
      });

      if (result.success) {
        console.log(`[admin-alert] Sent to ${email}: ${alertKey}`);
      } else {
        console.error(`[admin-alert] Email to ${email} failed: ${result.error}`);
      }
    } catch (err) {
      console.error(`[admin-alert] Email to ${email} error: ${(err as Error).message}`);
    }
  }
}

// ── Convenience: check error and alert if billing-related ───────────────────

export async function checkAndAlertBilling(
  provider: string,
  errorMessage: string,
  context?: Record<string, string | number | undefined>
) {
  if (isBillingError(errorMessage)) {
    await alertAdmin({
      subject: `${provider} — Credit / Quota Error`,
      provider,
      errorMessage,
      context,
    });
  }
}
