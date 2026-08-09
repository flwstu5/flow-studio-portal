"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[var(--brand-color)] text-white text-sm font-medium rounded px-3 py-2.5 mt-2 disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Submit request"}
    </button>
  );
}
