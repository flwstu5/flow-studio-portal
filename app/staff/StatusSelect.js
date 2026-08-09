"use client";

import { useState, useTransition } from "react";
import { updateRequestStatus } from "./actions";

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "delivered", label: "Delivered" },
];

export default function StatusSelect({ requestId, currentStatus }) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleChange(e) {
    const newStatus = e.target.value;
    const previousStatus = status;
    setError(null);
    setStatus(newStatus);
    startTransition(async () => {
      try {
        await updateRequestStatus(requestId, newStatus);
      } catch (err) {
        setStatus(previousStatus);
        setError(err.message || "Failed to update status — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={status}
        disabled={isPending}
        onChange={handleChange}
        className="text-xs border border-neutral-300 rounded px-2 py-1.5 bg-white flex-shrink-0 disabled:opacity-60"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
