"use client";

import { useRouter } from "next/navigation";

export function CampaignFilter({
  campaigns,
  current,
  days,
}: {
  campaigns: string[];
  current: string;
  days: number;
}) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams({ days: String(days) });
        if (e.target.value) params.set("campaign", e.target.value);
        router.push(`/search-terms?${params.toString()}`);
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
