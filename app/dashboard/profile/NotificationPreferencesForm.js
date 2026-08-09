"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

export default function NotificationPreferencesForm({ currentNotifyMessages, currentNotifyDelivery }) {
  const [notifyMessages, setNotifyMessages] = useState(currentNotifyMessages);
  const [notifyDelivery, setNotifyDelivery] = useState(currentNotifyDelivery);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const supabase = createClient();

  async function handleToggle(field, value, setLocal) {
    setLocal(value);
    setStatus("saving");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("clients")
        .update({ [field]: value })
        .eq("auth_user_id", user.id);

      if (error) throw error;
      setStatus("saved");
    } catch (err) {
      console.error("Notification preference save failed:", err);
      setLocal(!value);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Toggle
        label="Email me about new messages"
        checked={notifyMessages}
        onChange={(v) => handleToggle("notify_messages", v, setNotifyMessages)}
      />
      <Toggle
        label="Email me when a request is delivered"
        checked={notifyDelivery}
        onChange={(v) => handleToggle("notify_delivery", v, setNotifyDelivery)}
      />
      <p className="text-xs text-neutral-400">
        You'll still see these in your Notifications tab either way — this only controls email.
      </p>
      {status === "saved" && <span className="text-xs text-green-700">Saved!</span>}
      {status === "error" && <span className="text-xs text-red-600">Something went wrong — try again.</span>}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-neutral-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--brand-color)] ${
          checked ? "bg-[var(--brand-color)]" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
