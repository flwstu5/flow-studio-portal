"use client";

import { useState, useTransition } from "react";
import { createClient } from "../../../../lib/supabaseClient";

export default function MessageThread({ requestId, initialMessages, senderType, senderLabel }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    startTransition(async () => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          request_id: requestId,
          sender_type: senderType,
          sender_label: senderLabel,
          body: text,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        setBody("");
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
                m.sender_type === senderType
                  ? "self-end bg-brand-dark text-white ml-auto"
                  : "self-start bg-neutral-100 text-neutral-800"
              }`}
            >
              <p className="text-[11px] opacity-70 mb-0.5">{m.sender_label}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-400">No messages yet — say hello.</p>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
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
