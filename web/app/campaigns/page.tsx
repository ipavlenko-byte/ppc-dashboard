import {
  summarizeByCampaign,
  grandTotal,
  applyDateFilter,
  getPeriodBounds,
  getPreviousPeriodBounds,
  filterByRange,
} from "@/lib/metrics";
import { getDashboardData } from "@/lib/dataSource";
import { resolveDateFilter } from "@/lib/dateFilter";
import { CampaignsTable } from "@/components/CampaignsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { flagCampaign } from "@/lib/anomalies";
import { computeCampaignTrend } from "@/lib/trends";

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

  const campaignsWithConversions = summaries.filter((s) => s.conversions > 0);
  const accountAvgCpl =
    campaignsWithConversions.length > 0
      ? campaignsWithConversions.reduce((sum, s) => sum + s.cpl, 0) / campaignsWithConversions.length
      : 0;

  const currentBounds = getPeriodBounds(allRows, filter);
  const prevSummaryByCampaign = new Map<string, ReturnType<typeof summarizeByCampaign>[number]>();
  if (currentBounds) {
    const prevBounds = getPreviousPeriodBounds(currentBounds);
    const prevRows = filterByRange(allRows, prevBounds.from, prevBounds.to);
    for (const s of summarizeByCampaign(prevRows)) {
      prevSummaryByCampaign.set(s.campaign, s);
    }
  }

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
        flagFor={(c) => flagCampaign(c, accountAvgCpl)}
        trendFor={(c) => computeCampaignTrend(c, prevSummaryByCampaign.get(c.campaign))}
      />
    </div>
  );
}
