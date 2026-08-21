"use client";

import { ResolvedDateFilter } from "@/lib/dateFilter";

export function CampaignFilter({
  campaigns,
  current,
  filter,
  basePath,
}: {
  campaigns: string[];
  current: string;
  filter: ResolvedDateFilter;
  basePath: string;
}) {
  return (
    <select
      value={current}
      onChange={(e) => {
        const params: Record<string, string> =
          filter.mode === "range" && filter.from && filter.to
            ? { from: filter.from, to: filter.to }
            : { days: String(filter.days) };
        if (e.target.value) params.campaign = e.target.value;
        // Полная перезагрузка страницы вместо клиентской навигации — обходит
        // кэш роутов Next.js, который в проде иногда отдаёт устаревший RSC-payload
        // при переходах, меняющих только query-параметры.
        window.location.href = `${basePath}?${new URLSearchParams(params).toString()}`;
      }}
      className="min-w-[220px] rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-400 focus:border-blue-500"
    >
      <option value="">Все кампании</option>
      {campaigns.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
