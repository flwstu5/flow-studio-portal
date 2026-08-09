"use client";

import { useTransition } from "react";
import { assignRequest } from "../../actions";

export default function AssignSelect({ requestId, staffEmails, currentAssignee }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;
    startTransition(async () => {
      try {
        await assignRequest(requestId, value);
      } catch (err) {
        console.error("Failed to assign request:", err);
      }
    });
  }

  return (
    <select
      value={currentAssignee ?? ""}
      onChange={handleChange}
      disabled={isPending}
      aria-label="Assigned to"
      className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white disabled:opacity-60"
    >
      <option value="">Unassigned</option>
      {staffEmails.map((email) => (
        <option key={email} value={email}>
          {email}
        </option>
      ))}
    </select>
  );
}
