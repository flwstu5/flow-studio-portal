"use client";

import { useState, useTransition } from "react";
import { archiveClient, unarchiveClient } from "../../actions";

export default function ArchiveButton({ clientId, archived }) {
  const [isArchived, setIsArchived] = useState(archived);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isArchived) {
      startTransition(async () => {
        await unarchiveClient(clientId);
        setIsArchived(false);
      });
      return;
    }

    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      await archiveClient(clientId);
      setIsArchived(true);
      setConfirming(false);
    });
  }

  if (isArchived) {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-brand-dark border border-brand-light rounded px-2.5 py-1 disabled:opacity-60"
      >
        {isPending ? "Restoring…" : "Unarchive"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <span className="text-xs text-neutral-500">Sure? History is kept, this just hides them.</span>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        onBlur={() => setConfirming(false)}
        className={`text-xs rounded px-2.5 py-1 border disabled:opacity-60 ${
          confirming
            ? "text-white bg-red-600 border-red-600"
            : "text-neutral-500 border-neutral-300"
        }`}
      >
        {isPending ? "Archiving…" : confirming ? "Confirm archive" : "Archive"}
      </button>
    </div>
  );
}
