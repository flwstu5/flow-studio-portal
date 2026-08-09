"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignOutButton from "../dashboard/SignOutButton";

export default function StaffSidebar({ active }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((res) => res.json())
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, [active]);

  function handleSearch(e) {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    router.push(`/staff/search?q=${encodeURIComponent(q)}`);
  }

  const items = [
    { label: "Overview", href: "/staff" },
    { label: "Clients", href: "/staff/clients" },
    { label: "Leads", href: "/staff/leads" },
    { label: "Requests", href: "/staff/requests" },
    { label: "Referrals", href: "/staff/referrals" },
    { label: "Deadlines", href: "/staff/deadlines" },
    { label: "Capacity", href: "/staff/capacity" },
    { label: "Files", href: "/staff/files" },
    { label: "Messages", href: "/staff/messages" },
    { label: "Notifications", href: "/staff/notifications" },
  ];

  return (
    <aside className="w-44 border-r border-neutral-200 p-4 flex flex-col gap-1 flex-shrink-0">
      <div className="flex items-center gap-2 px-2 pb-6">
        <img src="/logo-icon.png" alt="Flow Studio" className="w-9 h-9 rounded" />
        <span className="text-sm font-medium">Flow Studio</span>
      </div>

      <form onSubmit={handleSearch} className="px-2 pb-4">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search…"
          aria-label="Search clients, requests, and messages"
          className="w-full border border-neutral-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-light"
        />
      </form>

      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`text-sm px-2.5 py-2 rounded flex items-center justify-between ${
            active === item.label
              ? "bg-brand-tint text-brand-dark font-medium"
              : "text-neutral-500"
          }`}
        >
          {item.label}
          {item.label === "Notifications" && unreadCount > 0 && (
            <span className="text-[10px] font-medium bg-brand-dark text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center flex-shrink-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      ))}

      <div className="mt-auto">
        <SignOutButton />
      </div>
    </aside>
  );
}