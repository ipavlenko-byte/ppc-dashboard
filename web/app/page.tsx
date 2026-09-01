import Link from "next/link";
import {
  grandTotal,
  dailyTrend,
  applyDateFilter,
  summarizeByCampaign,
  getPeriodBounds,
  getPreviousPeriodBounds,
  filterByRange,
} from "@/lib/metrics";
import { getDashboardData } from "@/lib/dataSource";
import { resolveDateFilter } from "@/lib/dateFilter";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { computeCampaignTrend, CampaignTrend } from "@/lib/trends";
import { generateRecommendations } from "@/lib/recommendations";
import { fmtInt, fmtMoney, fmtUsd, fmtPct, fmtDecimal, fmtDuration, fmtOrDash } from "@/lib/format";

export const revalidate = 300; // пересчёт кэша раз в 5 минут

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { rows: allRows, source } = await getDashboardData();
  const rows = applyDateFilter(allRows, filter);
  const total = grandTotal(rows);
  const trend = dailyTrend(rows);

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
  const topRecommendations = generateRecommendations(summaries, accountAvgCpl, trendByCampaign).slice(0, 3);

  const linkQuery =
    filter.mode === "range" ? `from=${filter.from}&to=${filter.to}` : `days=${filter.days}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Overview — {filter.label}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <DateRangePicker basePath="/" current={filter} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Затраты" value={fmtMoney(total.cost)} subValue={`≈${fmtUsd(total.cost)}`} />
        <KpiTile label="Показы" value={fmtInt(total.impressions)} />
        <KpiTile label="Клики" value={fmtInt(total.clicks)} />
        <KpiTile label="CTR" value={fmtPct(total.ctr)} />
        <KpiTile label="Заявки" value={fmtInt(total.conversions)} />
        <KpiTile label="Кач. заявки" value={fmtInt(total.qualifiedLeads)} />
        <KpiTile label="CPL" value={fmtMoney(total.cpl)} subValue={`≈${fmtUsd(total.cpl)}`} />
        <KpiTile label="CPQL" value={fmtMoney(total.cpql)} subValue={`≈${fmtUsd(total.cpql)}`} />
        <KpiTile label="CPC" value={fmtMoney(total.cpc)} subValue={`≈${fmtUsd(total.cpc)}`} />
        <KpiTile label="Процент отказов" value={fmtOrDash(total.bounceRate, fmtPct)} />
        <KpiTile label="Глубина просмотра" value={fmtOrDash(total.pagesPerSession, fmtDecimal)} />
        <KpiTile
          label="Время на сайте"
          value={fmtOrDash(total.avgSessionDurationSec, fmtDuration)}
        />
      </div>

      <TrendChart data={trend} />

      {topRecommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">На что обратить внимание</h2>
            <Link
              href={`/recommendations?${linkQuery}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Все рекомендации →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {topRecommendations.map((r, i) => (
              <div
                key={i}
                className={
                  r.severity === "critical"
                    ? "rounded-lg border border-red-200 bg-red-50 px-4 py-2.5"
                    : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5"
                }
              >
                <div className="flex items-center gap-2 text-sm">
                  <span aria-hidden>{r.severity === "critical" ? "🔴" : "🟡"}</span>
                  <span className="font-semibold text-slate-500">{r.campaign}</span>
                  <span className="text-slate-800">{r.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
