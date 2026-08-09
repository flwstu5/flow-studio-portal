"use client";

import { useEffect } from "react";

// Registers the no-op service worker so the portal qualifies as an
// installable PWA (Add to Home Screen / desktop install prompt).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
