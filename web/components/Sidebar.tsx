"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/search-terms", label: "Search Terms" },
  { href: "/devices", label: "Devices" },
  { href: "/geo", label: "Geo" },
  { href: "/landing-pages", label: "Landing Pages" },
  { href: "/seo", label: "SEO" },
  { href: "/wasted-spend", label: "Wasted Spend" },
  { href: "/budget-pacing", label: "Budget Pacing" },
];

export function Sidebar() {
  const searchParams = useSearchParams();

  // Переносим выбранный период (пресет или диапазон дат) на все разделы —
  // остальные параметры (campaign, minCost и т.п.) специфичны для конкретной
  // страницы и не переносятся.
  const dateQuery = new URLSearchParams();
  if (searchParams.get("from") && searchParams.get("to")) {
    dateQuery.set("from", searchParams.get("from")!);
    dateQuery.set("to", searchParams.get("to")!);
  } else if (searchParams.get("days")) {
    dateQuery.set("days", searchParams.get("days")!);
  }
  const suffix = dateQuery.toString() ? `?${dateQuery.toString()}` : "";

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
            href={`${l.href}${suffix}`}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
