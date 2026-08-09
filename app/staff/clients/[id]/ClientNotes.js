"use client";

import { useState, useTransition } from "react";
import { updateClientNotes } from "../../actions";

export default function ClientNotes({ clientId, initialNotes }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [isPending, startTransition] = useTransition();

  const dirty = notes !== savedNotes;

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateClientNotes(clientId, notes);
        setSavedNotes(notes);
        setStatus("saved");
      } catch (err) {
        console.error("Failed to save client notes:", err);
        setStatus("error");
      }
    });
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium">Internal notes</h2>
        <span className="text-xs text-neutral-400">Staff-only — never shown to the client</span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        placeholder="Context, reminders, next steps…"
        rows={4}
        className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="text-xs font-medium bg-brand-dark text-white rounded px-3 py-1.5 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save notes"}
        </button>
        {!dirty && status === "saved" && <span className="text-xs text-green-700">Saved!</span>}
        {status === "error" && <span className="text-xs text-red-600">Something went wrong — try again.</span>}
      </div>
    </div>
  );
}
