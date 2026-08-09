"use client";

import { useState, useTransition } from "react";
import { sendCheckIn } from "./actions";

export default function CheckInButton({ clientId, alreadySentRecently }) {
  const [sent, setSent] = useState(alreadySentRecently);
  const [isPending, startTransition] = useTransition();

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await sendCheckIn(clientId);
        setSent(true);
      } catch (err) {
        console.error("Failed to send check-in:", err);
      }
    });
  }

  if (sent) {
    return <span className="text-xs text-neutral-400 flex-shrink-0">Check-in sent</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-blue-700 border border-blue-200 rounded px-2 py-0.5 flex-shrink-0 disabled:opacity-60"
    >
      {isPending ? "Sending…" : "Send check-in"}
    </button>
  );
}
