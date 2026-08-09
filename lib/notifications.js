import { sendEmail } from "./email";

const PORTAL_URL = "https://portal.flowstudiogrfx.com";

export function staffEmails() {
  return (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function wrapper(bodyHtml, ctaHref, ctaLabel) {
  return `
    <div style="font-family: sans-serif; color: #171717; max-width: 480px;">
      ${bodyHtml}
      <p style="margin-top: 20px;">
        <a href="${ctaHref}" style="display:inline-block; background:#CB181D; color:#fff; text-decoration:none; padding:8px 16px; border-radius:4px; font-size:14px; font-weight:500;">
          ${ctaLabel}
        </a>
      </p>
    </div>
  `;
}

// Fires when a client sends a message — notifies all staff.
export async function notifyStaffOfMessage({ requestId, requestTitle, senderLabel, body }) {
  await sendEmail({
    to: staffEmails(),
    subject: `New message from ${senderLabel}`,
    html: wrapper(
      `<p>New message on <strong>${requestTitle}</strong> from ${senderLabel}:</p>
       <p style="background:#f5f5f5; padding:12px; border-radius:4px; white-space:pre-wrap;">${escapeHtml(body)}</p>`,
      `${PORTAL_URL}/staff/requests/${requestId}`,
      "View & reply"
    ),
  });
}

// Fires when staff sends a message — notifies the client.
export async function notifyClientOfMessage({ requestId, requestTitle, clientEmail, body }) {
  if (!clientEmail) return;
  await sendEmail({
    to: clientEmail,
    subject: `New message from Flow Studio`,
    html: wrapper(
      `<p>You have a new message on <strong>${requestTitle}</strong>:</p>
       <p style="background:#f5f5f5; padding:12px; border-radius:4px; white-space:pre-wrap;">${escapeHtml(body)}</p>`,
      `${PORTAL_URL}/dashboard/requests/${requestId}`,
      "View & reply"
    ),
  });
}

// Fires when staff marks a request delivered — notifies the client.
export async function notifyClientOfDelivery({ requestId, requestTitle, clientEmail }) {
  if (!clientEmail) return;
  await sendEmail({
    to: clientEmail,
    subject: `Your ${requestTitle} is ready`,
    html: wrapper(
      `<p><strong>${requestTitle}</strong> has been delivered — download it and let us know what you think.</p>`,
      `${PORTAL_URL}/dashboard/requests/${requestId}`,
      "View & download"
    ),
  });
}

// Fires when a client submits a new request — notifies all staff.
export async function notifyStaffOfNewRequest({ requestId, requestTitle, businessName }) {
  await sendEmail({
    to: staffEmails(),
    subject: `New request from ${businessName}`,
    html: wrapper(
      `<p><strong>${requestTitle}</strong> was just submitted by ${businessName}.</p>`,
      `${PORTAL_URL}/staff/requests/${requestId}`,
      "View request"
    ),
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
