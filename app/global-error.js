"use client";

import { useEffect } from "react";

// Last-resort fallback for an error thrown by the root layout itself (rare —
// app/error.js can't catch that case since it renders inside the layout).
// Next.js requires this file to render its own <html>/<body> since it
// replaces the entire root layout when it's shown.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Flow Studio</p>
            <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#737373", marginBottom: 24 }}>
              That's on us — try again, and if it keeps happening, reach out and we'll take a look.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                background: "#CB181D",
                borderRadius: 6,
                padding: "8px 16px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
