"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDeliverable } from "./actions";

export default function UploadDeliverable({ requestId, hasFile }) {
  const inputRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        await uploadDeliverable(requestId, formData);
      } catch (err) {
        setError(err.message);
      }
    });

    // Reset so the same filename can be re-selected if needed.
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="text-xs text-brand-dark border border-brand-light rounded px-2 py-1.5 disabled:opacity-60"
      >
        {isPending ? "Uploading…" : hasFile ? "Replace file" : "Upload file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
