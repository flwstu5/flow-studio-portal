"use client";

import { useTransition } from "react";
import { setReferralReward } from "../actions";

const OPTIONS = [
  { value: "none", label: "No reward yet" },
  { value: "owed", label: "Reward owed" },
  { value: "paid", label: "Reward paid" },
];

export default function RewardStatusSelect({ referralId, currentStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;
    startTransition(async () => {
      try {
        await setReferralReward(referralId, value);
      } catch (err) {
        console.error("Failed to update reward status:", err);
      }
    });
  }

  return (
    <select
      value={currentStatus ?? "none"}
      onChange={handleChange}
      disabled={isPending}
      aria-label="Reward status"
      className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
