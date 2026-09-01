"use client";

import { ResolvedDateFilter } from "@/lib/dateFilter";

export function GroupFilter({
  groups,
  current,
  filter,
  basePath,
}: {
  groups: string[];
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
        if (e.target.value) params.group = e.target.value;
        // Полная перезагрузка вместо клиентской навигации — обходит кэш роутов
        // Next.js (см. CampaignFilter.tsx).
        window.location.href = `${basePath}?${new URLSearchParams(params).toString()}`;
      }}
      className="min-w-[200px] rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-400 focus:border-blue-500"
    >
      <option value="">Все группы</option>
      {groups.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}
