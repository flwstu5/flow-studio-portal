"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestRevision } from "./actions";

export default function RevisionRequestButton({ requestId }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [requested, setRequested] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const router = useRouter();

  if (requested) {
    return (
      <p className="text-xs text-green-700 mb-4">
        Revision requested — we'll follow up in the messages below.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-3 py-1.5 mb-4"
      >
        Request a revision
      </button>
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await requestRevision(requestId, notes);
        setRequested(true);
        router.refresh();
      } catch (err) {
        console.error("Revision request failed:", err);
        setError("Something went wrong sending that — try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What would you like changed? (optional)"
        rows={3}
        className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[var(--brand-color)] text-white text-sm font-medium rounded px-3 py-1.5 disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send revision request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
