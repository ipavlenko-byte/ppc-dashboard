import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/search-terms", label: "Search Terms" },
  { href: "/devices", label: "Devices" },
  { href: "/geo", label: "Geo" },
  { href: "/landing-pages", label: "Landing Pages" },
  { href: "/wasted-spend", label: "Wasted Spend" },
  { href: "/budget-pacing", label: "Budget Pacing" },
];

export function Sidebar() {
  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white px-4 py-5">
      <div className="mb-6 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://allcorrectgames.com/wp-content/uploads/2023/08/logo_blue.png"
          alt="Allcorrect"
          className="h-7 w-auto"
        />
        <span className="text-sm font-semibold text-slate-500">PPC Dashboard</span>
      </div>
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
