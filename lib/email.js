// Thin wrapper around Resend's HTTP API (no SDK dependency needed).
// Every call is fire-and-forget from the caller's perspective — failures
// are logged, never thrown, so a broken email never blocks the underlying
// action (a message send, a status update, etc.) from completing.

const FROM_ADDRESS = "Flow Studio <notifications@flowstudiogrfx.com>";

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY not set — skipping email:", subject);
    return;
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    console.error("No recipients for email:", subject);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: recipients,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Resend send failed:", res.status, text);
    }
  } catch (err) {
    console.error("Resend send error:", err.message);
  }
}
