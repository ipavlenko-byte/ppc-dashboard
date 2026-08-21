import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/search-terms", label: "Search Terms" },
];

export function Sidebar() {
  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white px-4 py-5">
      <div className="mb-6 text-lg font-bold text-blue-600">PPC Dashboard</div>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
