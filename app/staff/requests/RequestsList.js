"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusSelect from "../StatusSelect";
import UploadDeliverable from "../UploadDeliverable";

const statusStyles = {
  submitted: "bg-brand-tint text-brand-dark",
  in_review: "bg-brand-tint text-brand-dark",
  delivered: "bg-green-100 text-green-700",
};

const statusLabels = {
  submitted: "Submitted",
  in_review: "In review",
  delivered: "Delivered",
};

export default function RequestsList({ clientGroups }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientGroups;
    return clientGroups
      .map((group) => {
        const businessMatches = group.businessName.toLowerCase().includes(q);
        if (businessMatches) return group;
        const requests = group.requests.filter((r) => {
          const haystack = `${r.title ?? ""} ${r.type ?? ""} ${statusLabels[r.status] ?? r.status ?? ""}`.toLowerCase();
          return haystack.includes(q);
        });
        return requests.length ? { ...group, requests } : null;
      })
      .filter(Boolean);
  }, [clientGroups, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search requests by client, title, type, or status…"
        className="w-full border border-neutral-300 rounded px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-brand-light"
      />

      <div className="flex flex-col gap-6">
        {filtered.length ? (
          filtered.map((group, i) => (
            <div key={i} className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{group.businessName}</span>
                  {group.tier && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-dark text-white capitalize">
                      {group.tier}
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-500">
                  {group.requests.length} request{group.requests.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-col px-4">
                {group.requests.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
            {query ? "No requests match that search." : "No requests yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function RequestRow({ request }) {
  return (
    <div className="border-t border-neutral-100 py-3 flex items-start justify-between gap-4 first:border-t-0">
      <div className="min-w-0">
        <Link href={`/staff/requests/${request.id}`} className="text-sm font-medium truncate hover:underline">{request.title}</Link>
        <p className="text-xs text-neutral-500 mt-0.5 capitalize">
          {request.type}
          {" · "}
          <span className={`px-1.5 py-0.5 rounded ${statusStyles[request.status] ?? "bg-neutral-100 text-neutral-600"}`}>
            {statusLabels[request.status] ?? request.status}
          </span>
        </p>
        {request.brief && (
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{request.brief}</p>
        )}
        {request.fileName && (
          <p className="text-xs text-neutral-500 mt-1">
            📎{" "}
            {request.viewUrl ? (
              <a href={request.viewUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {request.fileName}
              </a>
            ) : (
              request.fileName
            )}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <StatusSelect requestId={request.id} currentStatus={request.status} />
        <UploadDeliverable requestId={request.id} hasFile={!!request.file_path} />
      </div>
    </div>
  );
}
