import {
  summarizeByCampaign,
  applyDateFilter,
  getPeriodBounds,
  getPreviousPeriodBounds,
  filterByRange,
} from "@/lib/metrics";
import { getDashboardData } from "@/lib/dataSource";
import { resolveDateFilter } from "@/lib/dateFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { computeCampaignTrend, CampaignTrend } from "@/lib/trends";
import { generateRecommendations } from "@/lib/recommendations";

export const revalidate = 300;

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { rows: allRows } = await getDashboardData();
  const rows = applyDateFilter(allRows, filter);
  const summaries = summarizeByCampaign(rows);

  const campaignsWithConversions = summaries.filter((s) => s.conversions > 0);
  const accountAvgCpl =
    campaignsWithConversions.length > 0
      ? campaignsWithConversions.reduce((sum, s) => sum + s.cpl, 0) / campaignsWithConversions.length
      : 0;

  const currentBounds = getPeriodBounds(allRows, filter);
  const trendByCampaign = new Map<string, CampaignTrend | null>();
  if (currentBounds) {
    const prevBounds = getPreviousPeriodBounds(currentBounds);
    const prevRows = filterByRange(allRows, prevBounds.from, prevBounds.to);
    const prevByCampaign = new Map(summarizeByCampaign(prevRows).map((s) => [s.campaign, s]));
    for (const s of summaries) {
      trendByCampaign.set(s.campaign, computeCampaignTrend(s, prevByCampaign.get(s.campaign)));
    }
  }

  const recommendations = generateRecommendations(summaries, accountAvgCpl, trendByCampaign);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Рекомендации — {filter.label}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Автоматические правила по данным Google Ads/GA4 — без LLM, бесплатно.
          </p>
        </div>
        <DateRangePicker basePath="/recommendations" current={filter} />
      </div>

      {recommendations.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800 shadow-sm">
          🟢 Явных проблем не найдено за выбранный период.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recommendations.map((r, i) => (
            <div
              key={i}
              className={
                r.severity === "critical"
                  ? "rounded-lg border border-red-200 bg-red-50 p-4"
                  : "rounded-lg border border-amber-200 bg-amber-50 p-4"
              }
            >
              <div className="flex items-center gap-2">
                <span aria-hidden>{r.severity === "critical" ? "🔴" : "🟡"}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {r.campaign}
                </span>
              </div>
              <div className="mt-1 font-medium text-slate-900">{r.title}</div>
              <div className="mt-1 text-sm text-slate-600">{r.advice}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
