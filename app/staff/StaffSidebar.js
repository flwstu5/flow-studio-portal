import Link from "next/link";

export default function StaffSidebar({ active }) {
  const items = [
    { label: "Overview", href: "/staff" },
    { label: "Clients", href: "/staff/clients" },
    { label: "Requests", href: "/staff/requests" },
    { label: "Files", href: "/staff/files" },
    { label: "Messages", href: "/staff/messages" },
  ];

  return (
    <aside className="w-44 border-r border-neutral-200 p-4 flex flex-col gap-1 flex-shrink-0">
      <div className="flex items-center gap-2 px-2 pb-6">
        <img src="/logo-icon.png" alt="Flow Studio" className="w-9 h-9 rounded" />
        <span className="text-sm font-medium">Flow Studio</span>
      </div>

      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`text-sm px-2.5 py-2 rounded block ${
            active === item.label
              ? "bg-brand-tint text-brand-dark font-medium"
              : "text-neutral-500"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}