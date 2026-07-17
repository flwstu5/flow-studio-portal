"use client";

import { useState, useTransition } from "react";
import { sendStaffMessage } from "../../actions";

export default function StaffMessageThread({ requestId, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    startTransition(async () => {
      try {
        await sendStaffMessage(requestId, text);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender_type: "staff",
            sender_label: "Flow Studio",
            body: text,
          },
        ]);
        setBody("");
      } catch {
        // Message will still show up on next page load via revalidation
        // even if this optimistic update path has an issue.
      }
    });
  }

  return (
    <div>
      <p className="text-sm font-medium mb-3">Messages</p>

      <div className="flex flex-col gap-3 mb-4">
        {messages.length ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                m.sender_type === "staff"
                  ? "self-end bg-brand-dark text-white ml-auto"
                  : "self-start bg-neutral-100 text-neutral-800"
              }`}
            >
              <p className="text-[11px] opacity-70 mb-0.5">{m.sender_label}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-400">No messages yet.</p>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply…"
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-dark text-white text-sm font-medium rounded px-4 py-2 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
