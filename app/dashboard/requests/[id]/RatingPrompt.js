"use client";

import { useState, useTransition } from "react";
import { submitRating } from "./actions";

export default function RatingPrompt({ requestId, initialRating }) {
  const [rating, setRating] = useState(initialRating ?? null);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(!!initialRating);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!rating) return;
    startTransition(async () => {
      try {
        await submitRating(requestId, rating, feedback);
        setSubmitted(true);
      } catch {
        // leave the stars/feedback in place so the client can try again
      }
    });
  }

  if (submitted) {
    return (
      <div className="border-t border-b border-neutral-200 py-4 mb-6">
        <p className="text-xs text-neutral-500">
          Thanks for the feedback{rating ? ` — ${rating}/5 stars` : ""}!
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-b border-neutral-200 py-4 mb-6">
      <p className="text-sm font-medium mb-2">How'd we do?</p>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isPending}
            onMouseEnter={() => setHover(star)}
            onClick={() => setRating(star)}
            aria-label={`Rate ${star} out of 5`}
            className="text-2xl leading-none disabled:opacity-60"
          >
            <span style={{ color: (hover || rating || 0) >= star ? "var(--brand-color)" : "#737373" }}>★</span>
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Anything you'd like to add? (optional)"
            rows={2}
            className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] resize-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="self-start bg-[var(--brand-color)] text-white text-xs font-medium rounded px-3 py-1.5 disabled:opacity-60"
          >
            {isPending ? "Submitting…" : "Submit rating"}
          </button>
        </div>
      )}
    </div>
  );
}
