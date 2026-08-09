"use client";

import { useEffect } from "react";

// Catches any unhandled error thrown while rendering a route below the root
// layout. Without this, users would see Next.js's raw default error screen
// instead of something on-brand. "reset" retries rendering the segment that
// threw, without a full page reload.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Unhandled portal error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src="/logo-icon.png" alt="Flow Studio" className="w-8 h-8 rounded" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>
        <h1 className="text-xl font-medium mb-2">Something went wrong</h1>
        <p className="text-sm text-neutral-500 mb-6">
          That's on us — try again, and if it keeps happening, reach out and we'll take a look.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="text-sm font-medium text-white rounded px-4 py-2"
            style={{ backgroundColor: "#CB181D" }}
          >
            Try again
          </button>
          <a href="/" className="text-sm font-medium text-neutral-600 border border-neutral-300 rounded px-4 py-2">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
