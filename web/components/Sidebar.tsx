"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const adsLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/search-terms", label: "Search Terms" },
  { href: "/devices", label: "Devices" },
  { href: "/geo", label: "Geo" },
  { href: "/landing-pages", label: "Landing Pages" },
  { href: "/wasted-spend", label: "Wasted Spend" },
  { href: "/budget-pacing", label: "Budget Pacing" },
];

const seoLinks = [
  { href: "/seo", label: "Обзор" },
  { href: "/seo/geo", label: "География" },
  { href: "/seo/devices", label: "Устройства" },
];

const reportsLinks = [
  { href: "/reports/traffic", label: "Traffic" },
  { href: "/reports/funnel", label: "Воронка" },
  { href: "/reports/ads-monthly", label: "Google Ads" },
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
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Реклама
      </div>
      <nav className="flex flex-col gap-1">
        {adsLinks.map((l) => (
          <Link
            key={l.href}
            href={`${l.href}${suffix}`}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        SEO
      </div>
      <nav className="flex flex-col gap-1">
        {seoLinks.map((l) => (
          <Link
            key={l.href}
            href={`${l.href}${suffix}`}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Отчёты
      </div>
      <nav className="flex flex-col gap-1">
        {reportsLinks.map((l) => (
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
