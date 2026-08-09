import { sendEmail } from "./email";
import { createAdminClient } from "./supabaseAdmin";

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

// Writes the in-app notification row. Failures are logged, never thrown —
// same fire-and-forget philosophy as sendEmail, so a bad insert never
// blocks the message/status update/request that triggered it.
async function createNotification(row) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert(row);
    if (error) {
      console.error("Failed to create notification:", error.message);
    }
  } catch (err) {
    console.error("Notification insert error:", err.message);
  }
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

  await createNotification({
    recipient_type: "staff",
    request_id: requestId,
    type: "message",
    title: `New message from ${senderLabel}`,
    body: truncate(body),
    link: `/staff/requests/${requestId}`,
  });
}

// Fires when staff sends a message — notifies the client. notifyMessages
// gates the email only; the in-app notification always gets created.
export async function notifyClientOfMessage({ requestId, requestTitle, clientId, clientEmail, notifyMessages = true, body }) {
  if (clientEmail && notifyMessages) {
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

  if (clientId) {
    await createNotification({
      recipient_type: "client",
      client_id: clientId,
      request_id: requestId,
      type: "message",
      title: "New message from Flow Studio",
      body: truncate(body),
      link: `/dashboard/requests/${requestId}`,
    });
  }
}

// Fires when staff marks a request delivered — notifies the client.
// notifyDelivery gates the email only; the in-app notification always
// gets created.
export async function notifyClientOfDelivery({ requestId, requestTitle, clientId, clientEmail, notifyDelivery = true }) {
  if (clientEmail && notifyDelivery) {
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

  if (clientId) {
    await createNotification({
      recipient_type: "client",
      client_id: clientId,
      request_id: requestId,
      type: "delivered",
      title: `${requestTitle} is ready`,
      body: "Delivered — download it and let us know what you think.",
      link: `/dashboard/requests/${requestId}`,
    });
  }
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

  await createNotification({
    recipient_type: "staff",
    request_id: requestId,
    type: "new_request",
    title: `New request from ${businessName}`,
    body: requestTitle,
    link: `/staff/requests/${requestId}`,
  });
}

// Fires from the monthly flyer-reminder cron for active subscribers who
// haven't submitted a request in a while — no request_id since it isn't
// tied to one. Always sends (no per-client preference gate, unlike
// message/delivery emails — this is a single low-frequency nudge).
export async function notifyClientOfFlyerReminder({ clientId, clientEmail, businessName }) {
  if (clientEmail) {
    await sendEmail({
      to: clientEmail,
      subject: "You've got flyers waiting to be used",
      html: wrapper(
        `<p>Hey${businessName ? ` ${businessName}` : ""} — just a heads up that your plan includes flyer designs
         you haven't used yet this month. Whenever you're ready, submit a request and we'll get started.</p>`,
        `${PORTAL_URL}/dashboard/new-request`,
        "Submit a request"
      ),
    });
  }

  if (clientId) {
    await createNotification({
      recipient_type: "client",
      client_id: clientId,
      type: "flyer_reminder",
      title: "You've got flyers waiting to be used",
      body: "Submit a request whenever you're ready.",
      link: "/dashboard/new-request",
    });
  }
}

function truncate(str, max = 140) {
  const s = String(str ?? "");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
