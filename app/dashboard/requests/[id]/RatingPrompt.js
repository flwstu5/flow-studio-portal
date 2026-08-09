"use client";

import { useState, useTransition } from "react";
import { submitRating } from "./actions";

export default function RatingPrompt({ requestId, initialRating }) {
  const [rating, setRating] = useState(initialRating ?? null);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(!!initialRating);
  const [isPending, startTransition] = useTransition();

  function handleRate(value) {
    setRating(value);
    startTransition(async () => {
      try {
        await submitRating(requestId, value);
        setSubmitted(true);
      } catch {
        // leave the stars selected so the client can try again
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
            onClick={() => handleRate(star)}
            aria-label={`Rate ${star} out of 5`}
            className="text-2xl leading-none disabled:opacity-60"
          >
            <span style={{ color: (hover || rating || 0) >= star ? "var(--brand-color)" : "#d4d4d4" }}>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}
