/**
 * Email notification service using Resend.
 * Follows the email-marketing-template-skill: single-column, 600px, table-based layout,
 * bulletproof CTAs, plain-text fallback, and brand-consistent design.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
const APP_NAME = "Talk to My Lawyer";
const BRAND_COLOR = "#2563EB"; // blue-600
const BRAND_DARK = "#1E3A5F";

// ─── HTML Template Builder ───────────────────────────────────────────────────

function buildEmailHtml(opts: {
  preheader: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const cta = opts.ctaText && opts.ctaUrl
    ? `
    <tr>
      <td align="center" style="padding: 24px 0 8px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" bgcolor="${BRAND_COLOR}" style="border-radius: 8px;">
              <a href="${opts.ctaUrl}" target="_blank"
                style="display:inline-block;padding:14px 32px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                ${opts.ctaText}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0;font-family:Inter,Arial,sans-serif;font-size:13px;color:#6B7280;">
          Or copy this link: <a href="${opts.ctaUrl}" style="color:${BRAND_COLOR};">${opts.ctaUrl}</a>
        </p>
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Inter,Arial,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F3F4F6;">
    ${opts.preheader}
  </div>
  <!-- Container -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_DARK};padding:24px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                      ⚖️ ${APP_NAME}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin:0 0 16px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                      ${opts.title}
                    </h1>
                    <div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">
                      ${opts.body}
                    </div>
                  </td>
                </tr>
                ${cta}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.5;">
                ${opts.footerNote ?? `You received this email because you have an account with ${APP_NAME}.`}
                <br>This is an automated notification — please do not reply to this email.
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

function buildPlainText(opts: { title: string; body: string; ctaText?: string; ctaUrl?: string }): string {
  let text = `${APP_NAME}\n${"=".repeat(40)}\n\n${opts.title}\n\n${opts.body.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()}`;
  if (opts.ctaText && opts.ctaUrl) text += `\n\n${opts.ctaText}: ${opts.ctaUrl}`;
  text += `\n\n---\nThis is an automated notification from ${APP_NAME}.`;
  return text;
}

// ─── Email Sending Helpers ────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) console.error("[Email] Resend error:", error);
  } catch (err) {
    console.error("[Email] Failed to send:", err);
  }
}

// ─── Transactional Email Templates ───────────────────────────────────────────

/** Notify subscriber when their letter has been approved */
export async function sendLetterApprovedEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  appUrl: string;
  pdfUrl?: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const pdfLine = opts.pdfUrl
    ? `<p style="margin-top:12px;">\ud83d\udcc4 <a href="${opts.pdfUrl}" style="color:${BRAND_DARK};font-weight:bold;">Download your approved letter as PDF</a></p>`
    : "";
  const body = `
    <p>Hello ${opts.name},</p>
    <p>Great news! Your legal letter request has been <strong style="color:#059669;">approved</strong> by our attorney team.</p>
    <p><strong>Letter:</strong> ${opts.subject}</p>
    <p>Your final approved letter is now available for download in your account. Click the button below to view and download it.</p>
    ${pdfLine}
  `;
  const html = buildEmailHtml({
    preheader: "Your legal letter has been approved and is ready to download.",
    title: "Your Letter Has Been Approved ✓",
    body,
    ctaText: "View Your Approved Letter",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Your letter has been approved`,
    html,
    text: buildPlainText({ title: "Your Letter Has Been Approved", body: `Hello ${opts.name}, your legal letter "${opts.subject}" has been approved. View it at: ${ctaUrl}`, ctaText: "View Letter", ctaUrl }),
  });
}

/** Notify subscriber when their letter needs changes */
export async function sendNeedsChangesEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  attorneyNote?: string;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const noteBlock = opts.attorneyNote
    ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;font-style:italic;color:#92400E;">${opts.attorneyNote}</blockquote>`
    : "";
  const body = `
    <p>Hello ${opts.name},</p>
    <p>Our attorney has reviewed your letter request and has requested some changes before it can be approved.</p>
    <p><strong>Letter:</strong> ${opts.subject}</p>
    ${noteBlock}
    <p>Please review the feedback and update your request accordingly.</p>
  `;
  const html = buildEmailHtml({
    preheader: "Your letter needs some changes before it can be approved.",
    title: "Changes Requested for Your Letter",
    body,
    ctaText: "View Feedback & Update",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Changes requested for your letter`,
    html,
    text: buildPlainText({ title: "Changes Requested", body: `Hello ${opts.name}, your letter "${opts.subject}" needs changes. ${opts.attorneyNote ?? ""} View at: ${ctaUrl}`, ctaText: "View Letter", ctaUrl }),
  });
}

/** Notify subscriber when their letter has been rejected */
export async function sendLetterRejectedEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  reason?: string;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const reasonBlock = opts.reason
    ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#FEE2E2;border-left:4px solid #EF4444;border-radius:4px;color:#991B1B;">${opts.reason}</blockquote>`
    : "";
  const body = `
    <p>Hello ${opts.name},</p>
    <p>After careful review, our attorney team has determined that your letter request cannot be processed at this time.</p>
    <p><strong>Letter:</strong> ${opts.subject}</p>
    ${reasonBlock}
    <p>If you believe this is an error or have questions, please contact our support team.</p>
  `;
  const html = buildEmailHtml({
    preheader: "Your letter request has been reviewed.",
    title: "Letter Request Update",
    body,
    ctaText: "View Details",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Update on your letter request`,
    html,
    text: buildPlainText({ title: "Letter Request Update", body: `Hello ${opts.name}, your letter "${opts.subject}" could not be processed. ${opts.reason ?? ""} View at: ${ctaUrl}`, ctaText: "View Details", ctaUrl }),
  });
}

/** Notify attorney/employee when a new letter is ready for review */
export async function sendNewReviewNeededEmail(opts: {
  to: string;
  name: string;
  letterSubject: string;
  letterId: number;
  letterType: string;
  jurisdiction: string;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/review/${opts.letterId}`;
  const body = `
    <p>Hello ${opts.name},</p>
    <p>A new letter request is ready for your review in the attorney queue.</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F9FAFB;border-radius:8px;margin:16px 0;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;"><strong>Subject:</strong> ${opts.letterSubject}</p>
        <p style="margin:0 0 8px;"><strong>Type:</strong> ${opts.letterType}</p>
        <p style="margin:0;"><strong>Jurisdiction:</strong> ${opts.jurisdiction}</p>
      </td></tr>
    </table>
    <p>Please log in to claim and review this letter at your earliest convenience.</p>
  `;
  const html = buildEmailHtml({
    preheader: "A new letter is waiting for your review.",
    title: "New Letter Ready for Review",
    body,
    ctaText: "Review Letter",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] New letter ready for review: ${opts.letterSubject}`,
    html,
    text: buildPlainText({ title: "New Letter Ready for Review", body: `Hello ${opts.name}, a new letter "${opts.letterSubject}" (${opts.letterType}, ${opts.jurisdiction}) is ready for review. Claim it at: ${ctaUrl}`, ctaText: "Review Letter", ctaUrl }),
  });
}

/** Notify admin when an AI pipeline job fails */
export async function sendJobFailedAlertEmail(opts: {
  to: string;
  name: string;
  letterId: number;
  jobType: string;
  errorMessage: string;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/admin/jobs`;
  const body = `
    <p>Hello ${opts.name},</p>
    <p>An AI pipeline job has <strong style="color:#DC2626;">failed</strong> and requires your attention.</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#FEF2F2;border-radius:8px;margin:16px 0;border:1px solid #FECACA;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;"><strong>Letter ID:</strong> #${opts.letterId}</p>
        <p style="margin:0 0 8px;"><strong>Job Type:</strong> ${opts.jobType}</p>
        <p style="margin:0;"><strong>Error:</strong> <code style="font-size:13px;color:#991B1B;">${opts.errorMessage}</code></p>
      </td></tr>
    </table>
    <p>Please review the failed job and retry if appropriate.</p>
  `;
  const html = buildEmailHtml({
    preheader: "An AI pipeline job has failed and needs attention.",
    title: "⚠️ Pipeline Job Failed",
    body,
    ctaText: "View Failed Jobs",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] ALERT: Pipeline job failed for letter #${opts.letterId}`,
    html,
    text: buildPlainText({ title: "Pipeline Job Failed", body: `Letter #${opts.letterId}, Job: ${opts.jobType}, Error: ${opts.errorMessage}. Manage at: ${ctaUrl}`, ctaText: "View Jobs", ctaUrl }),
  });
}

/** Notify subscriber when their letter enters a new processing stage */
export async function sendStatusUpdateEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  newStatus: string;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const statusMessages: Record<string, string> = {
    researching: "Our AI is now researching the applicable laws and regulations for your jurisdiction.",
    drafting: "Our AI is drafting your letter based on the legal research.",
    pending_review: "Your letter draft is complete and has been placed in the attorney review queue.",
    under_review: "An attorney has claimed your letter and is currently reviewing it.",
  };
  const message = statusMessages[opts.newStatus] ?? "Your letter request has been updated.";
  const body = `
    <p>Hello ${opts.name},</p>
    <p>${message}</p>
    <p><strong>Letter:</strong> ${opts.subject}</p>
    <p>You can track the progress of your letter in your account.</p>
  `;
  const html = buildEmailHtml({
    preheader: `Update on your letter: ${opts.subject}`,
    title: "Letter Status Update",
    body,
    ctaText: "Track Your Letter",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Update on your letter: ${opts.subject}`,
    html,
    text: buildPlainText({ title: "Letter Status Update", body: `Hello ${opts.name}, ${message} Letter: "${opts.subject}". Track at: ${ctaUrl}`, ctaText: "Track Letter", ctaUrl }),
  });
}

/** Validate Resend credentials (used in tests) */
export async function validateResendCredentials(): Promise<boolean> {
  try {
    const { data, error } = await resend.domains.list();
    return !error;
  } catch {
    return false;
  }
}

/** Confirm to subscriber that their letter has been received and the AI pipeline is running */
export async function sendLetterSubmissionEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  letterType: string;
  jurisdictionState: string;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const letterTypeLabel = opts.letterType
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const body = `
    <p>Hello ${opts.name},</p>
    <p>We've received your legal letter request and our AI pipeline is already working on it. You'll receive another email as soon as your draft is ready to review.</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;margin:20px 0;">
      <tr><td style="padding:20px;">
        <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#0369A1;"><strong>📋 Submission Details</strong></p>
        <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Subject:</strong> ${opts.subject}</p>
        <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Type:</strong> ${letterTypeLabel}</p>
        <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Jurisdiction:</strong> ${opts.jurisdictionState}</p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Letter ID:</strong> #${opts.letterId}</p>
      </td></tr>
    </table>
    <p><strong>What happens next?</strong></p>
    <ol style="margin:8px 0;padding-left:20px;font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.8;">
      <li>Our AI conducts jurisdiction-specific legal research</li>
      <li>A professional draft letter is generated</li>
      <li>You'll be notified to review and unlock your letter</li>
      <li>A licensed attorney reviews and approves your final letter</li>
    </ol>
    <p style="font-size:13px;color:#6B7280;">This typically takes 2–5 minutes. You can track progress in your account at any time.</p>
  `;
  const html = buildEmailHtml({
    preheader: `We've received your letter request #${opts.letterId} and the AI is working on it now.`,
    title: "Your Letter Request Has Been Received ✓",
    body,
    ctaText: "Track Your Letter",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Letter request received — #${opts.letterId}`,
    html,
    text: buildPlainText({
      title: "Your Letter Request Has Been Received",
      body: `Hello ${opts.name}, we've received your letter request #${opts.letterId} ("${opts.subject}", ${letterTypeLabel}, ${opts.jurisdictionState}). Our AI pipeline is processing it now. You'll receive another email when your draft is ready. Track progress at: ${ctaUrl}`,
      ctaText: "Track Your Letter",
      ctaUrl,
    }),
  });
}

/** Notify subscriber that their AI draft is ready and they can unlock it for attorney review */
export async function sendLetterReadyEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const body = `
    <p>Hello ${opts.name},</p>
    <p>Your AI-drafted legal letter is ready! Our system has completed the research and drafting stages for your request.</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin:20px 0;">
      <tr><td style="padding:20px;">
        <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#166534;"><strong>✅ Your Draft Is Ready</strong></p>
        <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Letter:</strong> ${opts.subject}</p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Letter ID:</strong> #${opts.letterId}</p>
      </td></tr>
    </table>
    <p>To send your letter for licensed attorney review and final approval, click the button below to view your draft and complete the unlock payment.</p>
    <p style="font-size:13px;color:#6B7280;">Attorney review ensures your letter is legally sound and professionally formatted before it's sent.</p>
  `;
  const html = buildEmailHtml({
    preheader: `Your AI-drafted letter is ready — unlock it for attorney review.`,
    title: "Your Letter Draft Is Ready 🎉",
    body,
    ctaText: "View & Unlock Your Letter — $29",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Your letter draft is ready — unlock for attorney review`,
    html,
    text: buildPlainText({
      title: "Your Letter Draft Is Ready",
      body: `Hello ${opts.name}, your AI-drafted letter "${opts.subject}" (Letter #${opts.letterId}) is ready. Unlock it for attorney review at: ${ctaUrl}`,
      ctaText: "View & Unlock Your Letter",
      ctaUrl,
    }),
  });
}

/** Confirm to subscriber that their payment was received and letter is now in attorney review */
export async function sendLetterUnlockedEmail(opts: {
  to: string;
  name: string;
  subject: string;
  letterId: number;
  appUrl: string;
}) {
  const ctaUrl = `${opts.appUrl}/letters/${opts.letterId}`;
  const body = `
    <p>Hello ${opts.name},</p>
    <p>Payment confirmed! Your letter has been sent to our attorney team for review and approval.</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;margin:20px 0;">
      <tr><td style="padding:20px;">
        <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#5B21B6;"><strong>⚖️ In Attorney Review</strong></p>
        <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Letter:</strong> ${opts.subject}</p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:14px;color:#374151;"><strong>Letter ID:</strong> #${opts.letterId}</p>
      </td></tr>
    </table>
    <p><strong>What happens next?</strong></p>
    <ol style="margin:8px 0;padding-left:20px;font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.8;">
      <li>A licensed attorney reviews your letter for legal accuracy</li>
      <li>They may request minor changes or approve it as-is</li>
      <li>You'll receive an email when your letter is approved and ready</li>
    </ol>
    <p style="font-size:13px;color:#6B7280;">Attorney review typically takes 1–2 business days. You can check the status of your letter at any time in your account.</p>
  `;
  const html = buildEmailHtml({
    preheader: `Payment confirmed — your letter is now with our attorney team.`,
    title: "Payment Confirmed — Letter In Review ✓",
    body,
    ctaText: "Track Review Status",
    ctaUrl,
  });
  await sendEmail({
    to: opts.to,
    subject: `[${APP_NAME}] Payment confirmed — your letter is in attorney review`,
    html,
    text: buildPlainText({
      title: "Payment Confirmed — Letter In Review",
      body: `Hello ${opts.name}, your payment has been confirmed and your letter "${opts.subject}" (Letter #${opts.letterId}) is now in attorney review. You'll receive an email when it's approved. Track status at: ${ctaUrl}`,
      ctaText: "Track Review Status",
      ctaUrl,
    }),
  });
}
