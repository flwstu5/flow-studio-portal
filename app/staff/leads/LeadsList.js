"use client";

import { useMemo, useState } from "react";

function nurtureStage(lead) {
  if (lead.nurture_7day_sent_at) return "7-day sent";
  if (lead.nurture_3day_sent_at) return "3-day sent";
  return "New";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeadsList({ leads }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((r) => {
      const haystack = `${r.business ?? ""} ${r.email ?? ""} ${r.url ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search leads by business, email, or site…"
        className="w-full border border-neutral-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-light"
      />

      <div className="flex flex-col">
        {filtered.length ? (
          filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{r.business || r.email}</span>
                  {r.converted && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-700 flex-shrink-0">
                      Converted
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {r.email} · {r.url} · {formatDate(r.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs font-medium px-2.5 py-1 rounded bg-brand-tint text-brand-dark">
                  {r.grade_letter ?? "—"} ({r.grade_percent ?? "—"}%)
                </span>
                <span className="text-xs text-neutral-400">{nurtureStage(r)}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
            {query ? "No leads match that search." : "No snapshot leads yet."}
          </p>
        )}
      </div>
    </div>
  );
}
