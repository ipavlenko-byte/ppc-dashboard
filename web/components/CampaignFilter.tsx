"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) => {
        const params: Record<string, string> =
          filter.mode === "range" && filter.from && filter.to
            ? { from: filter.from, to: filter.to }
            : { days: String(filter.days) };
        if (e.target.value) params.campaign = e.target.value;
        router.push(`${basePath}?${new URLSearchParams(params).toString()}`);
        router.refresh();
      }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
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
