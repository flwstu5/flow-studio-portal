"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Requests", href: "/dashboard/requests" },
  { label: "Files", href: "/dashboard/files" },
  { label: "Messages", href: "/dashboard/messages" },
  { label: "Notifications", href: "/dashboard/notifications" },
];

export default function Sidebar({ businessName, userEmail, logoUrl, showEditProfileLink = false }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((res) => res.json())
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  const initials = (businessName ?? "?").slice(0, 2).toUpperCase();

  function navLinks(onNavigate) {
    return NAV_ITEMS.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`text-sm px-2.5 py-2 rounded flex items-center justify-between ${
          pathname === item.href ? "bg-[var(--brand-tint)] text-[var(--brand-color)] font-medium" : "text-neutral-500"
        }`}
      >
        {item.label}
        {item.label === "Notifications" && unreadCount > 0 && (
          <span className="text-[10px] font-medium bg-[var(--brand-color)] text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    ));
  }

  const identityBadge = logoUrl ? (
    <img src={logoUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-6 h-6 rounded-full bg-[var(--brand-light)] flex items-center justify-center text-[10px] font-medium text-[var(--brand-color)] flex-shrink-0">
      {initials}
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Flow Studio" className="w-6 h-6 rounded" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="text-neutral-500 border border-neutral-200 rounded px-2.5 py-1.5 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-b border-neutral-200 px-4 py-3 flex flex-col gap-1 bg-white">
          {navLinks(() => setOpen(false))}
          {showEditProfileLink && (
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="text-xs text-[var(--brand-color)] px-2.5 py-2 block"
            >
              Edit business profile
            </Link>
          )}
          <div className="flex items-center gap-2 px-2.5 pt-3">
            {identityBadge}
            <span className="text-xs text-neutral-500 truncate">{businessName ?? userEmail}</span>
          </div>
          <SignOutButton />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-44 md:flex-shrink-0 border-r border-neutral-200 p-4 flex-col gap-1">
        <div className="flex items-center gap-2 px-2 pb-6">
          <img src="/logo-icon.png" alt="Flow Studio" className="w-6 h-6 rounded" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        {navLinks()}

        <div className="mt-auto flex items-center gap-2 px-2 pt-4">
          {identityBadge}
          <span className="text-xs text-neutral-500 truncate">{businessName ?? userEmail}</span>
        </div>
        {showEditProfileLink && (
          <Link href="/dashboard/profile" className="text-xs text-[var(--brand-color)] px-2 pb-2 block">
            Edit business profile
          </Link>
        )}
        <SignOutButton />
      </aside>
    </>
  );
}
