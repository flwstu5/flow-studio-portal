"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function ClientsList({ clients }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const base = clients.filter((c) => (showArchived ? true : !c.archived_at));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => {
      const haystack = `${c.business_name ?? ""} ${c.email ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query, showArchived]);

  const archivedCount = clients.filter((c) => c.archived_at).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients by name or email…"
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
        />
        {archivedCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-500 flex-shrink-0 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived ({archivedCount})
          </label>
        )}
      </div>

      <div className="flex flex-col">
        {filtered.length ? (
          filtered.map((c) => (
            <Link
              key={c.id}
              href={`/staff/clients/${c.id}`}
              className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${c.archived_at ? "text-neutral-400" : ""}`}>
                    {c.business_name ?? c.email}
                  </span>
                  {c.tier && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize flex-shrink-0">
                      {c.tier}
                    </span>
                  )}
                  {c.archived_at && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-200 text-neutral-600 flex-shrink-0">
                      Archived
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {c.email} · {c.client_type === "subscriber" ? "Subscriber" : "Project client"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {c.snapshotGrade && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded bg-brand-tint text-brand-dark"
                    title={`${c.snapshotOpportunityCount ?? 0} opportunities found`}
                  >
                    {c.snapshotGrade}
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  {c.openCount} open · {c.totalCount} total
                </span>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
            {query ? "No clients match that search." : "No clients yet."}
          </p>
        )}
      </div>
    </div>
  );
}
