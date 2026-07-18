"use client";

import { useState, useTransition } from "react";
import { updateClient } from "../../actions";

export default function EditClientForm({ clientId, currentBusinessName, currentTier }) {
  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState(currentBusinessName ?? "");
  const [tier, setTier] = useState(currentTier ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave(e) {
    e.preventDefault();
    startTransition(async () => {
      await updateClient(clientId, { businessName, tier: tier || null });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-brand-dark border border-brand-light rounded px-2.5 py-1"
      >
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex items-center gap-2">
      <input
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Business name"
        className="border border-neutral-300 rounded px-2 py-1 text-sm w-40"
      />
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        className="border border-neutral-300 rounded px-2 py-1 text-sm"
      >
        <option value="">No plan</option>
        <option value="starter">Starter</option>
        <option value="growth">Growth</option>
        <option value="premium">Premium</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-medium bg-brand-dark text-white rounded px-2.5 py-1 disabled:opacity-60"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-neutral-500"
      >
        Cancel
      </button>
    </form>
  );
}