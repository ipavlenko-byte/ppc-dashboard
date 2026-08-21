import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { CampaignsTable } from "@/components/CampaignsTable";
import { DateRangePicker } from "@/components/DateRangePicker";

export const revalidate = 300;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { rows: allRows } = await getDashboardData();
  const rows = applyDateFilter(allRows, filter);
  const summaries = summarizeByCampaign(rows);
  const total = grandTotal(rows);

  const linkQuery =
    filter.mode === "range" ? `from=${filter.from}&to=${filter.to}` : `days=${filter.days}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Кампании — {filter.label}</h1>
        <DateRangePicker basePath="/campaigns" current={filter} />
      </div>
      <CampaignsTable
        rows={summaries}
        total={total}
        linkFor={(campaign) => `/campaigns/${encodeURIComponent(campaign)}?${linkQuery}`}
      />
    </div>
  );
}
