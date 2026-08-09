"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertTestimonial, setTestimonialPublished } from "../../actions";

export default function TestimonialCapture({ requestId, defaultBusinessName, defaultQuote, existing }) {
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState(existing?.business_name ?? defaultBusinessName ?? "");
  const [quote, setQuote] = useState(existing?.quote ?? defaultQuote ?? "");
  const [role, setRole] = useState(existing?.role ?? "");
  const [result, setResult] = useState(existing?.result ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave(e) {
    e.preventDefault();
    startTransition(async () => {
      await upsertTestimonial(requestId, { businessName, quote, role, result });
      setOpen(false);
      router.refresh();
    });
  }

  function handleTogglePublished() {
    if (!existing) return;
    startTransition(async () => {
      await setTestimonialPublished(existing.id, requestId, !existing.published);
      router.refresh();
    });
  }

  if (existing && !open) {
    return (
      <div className="border border-neutral-200 rounded p-3 mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-600">
            {existing.published ? "Featured as testimonial" : "Testimonial saved (not published)"}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">"{existing.quote}"</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => setOpen(true)} className="text-xs text-brand-dark border border-brand-light rounded px-2.5 py-1">
            Edit
          </button>
          <button
            type="button"
            onClick={handleTogglePublished}
            disabled={isPending}
            className="text-xs text-neutral-500 border border-neutral-300 rounded px-2.5 py-1 disabled:opacity-60"
          >
            {existing.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand-dark border border-brand-light rounded px-3 py-1.5 mb-6"
      >
        Feature as testimonial
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="border border-neutral-200 rounded p-3 mb-6 flex flex-col gap-2">
      <input
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Business name"
        required
        className="border border-neutral-300 rounded px-2.5 py-1.5 text-sm"
      />
      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        placeholder="Quote — edit down the client's feedback into something quotable"
        rows={3}
        required
        className="border border-neutral-300 rounded px-2.5 py-1.5 text-sm resize-none"
      />
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Attribution, e.g. Founder, Bridgeway Collective (optional)"
        className="border border-neutral-300 rounded px-2.5 py-1.5 text-sm"
      />
      <input
        value={result}
        onChange={(e) => setResult(e.target.value)}
        placeholder="Result line, e.g. Website design & launch — live in time for their event (optional)"
        className="border border-neutral-300 rounded px-2.5 py-1.5 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-medium bg-brand-dark text-white rounded px-3 py-1.5 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save & publish"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
