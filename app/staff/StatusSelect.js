"use client";

import { useTransition } from "react";
import { updateRequestStatus } from "./actions";

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "delivered", label: "Delivered" },
];

export default function StatusSelect({ requestId, currentStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStatus}
      disabled={isPending}
      onChange={(e) => {
        const newStatus = e.target.value;
        startTransition(() => {
          updateRequestStatus(requestId, newStatus);
        });
      }}
      className="text-xs border border-neutral-300 rounded px-2 py-1.5 bg-white flex-shrink-0"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
