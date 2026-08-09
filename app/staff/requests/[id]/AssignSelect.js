"use client";

import { useState, useTransition } from "react";
import { assignRequest } from "../../actions";

export default function AssignSelect({ requestId, staffEmails, currentAssignee }) {
  const [assignee, setAssignee] = useState(currentAssignee ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleChange(e) {
    const value = e.target.value;
    const previous = assignee;
    setError(null);
    setAssignee(value);
    startTransition(async () => {
      try {
        await assignRequest(requestId, value);
      } catch (err) {
        console.error("Failed to assign request:", err);
        setAssignee(previous);
        setError("Failed to save — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={assignee}
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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
