// Thin wrapper around Mailgun's HTTP API (no SDK dependency needed).
// Every call is fire-and-forget from the caller's perspective — failures
// are logged, never thrown, so a broken email never blocks the underlying
// action (a message send, a status update, etc.) from completing.
//
// Uses Mailgun instead of Resend because flowstudiogrfx.com is already a
// verified Mailgun sending domain (used by the snapshot tool's nurture
// emails) — no DNS changes needed.

const FROM_ADDRESS = "Flow Studio <notifications@flowstudiogrfx.com>";
const MAILGUN_DOMAIN = "flowstudiogrfx.com";

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.MAILGUN_API_KEY;

  if (!apiKey) {
    console.error("MAILGUN_API_KEY not set — skipping email:", subject);
    return;
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    console.error("No recipients for email:", subject);
    return;
  }

  const body = new URLSearchParams({
    from: FROM_ADDRESS,
    to: recipients.join(","),
    subject,
    html,
  });

  try {
    const auth = Buffer.from(`api:${apiKey}`).toString("base64");
    const res = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Mailgun send failed:", res.status, text);
    }
  } catch (err) {
    console.error("Mailgun send error:", err.message);
  }
}
