import { getDashboardData } from "@/lib/dataSource";
import { grandTotal, dailyTrend, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { fmtInt, fmtMoney, fmtPct, fmtDecimal, fmtDuration, fmtOrDash } from "@/lib/format";

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
        <KpiTile label="Затраты" value={fmtMoney(total.cost)} />
        <KpiTile label="Показы" value={fmtInt(total.impressions)} />
        <KpiTile label="Клики" value={fmtInt(total.clicks)} />
        <KpiTile label="CTR" value={fmtPct(total.ctr)} />
        <KpiTile label="Заявки" value={fmtInt(total.conversions)} />
        <KpiTile label="Кач. заявки" value={fmtInt(total.qualifiedLeads)} />
        <KpiTile label="CPL" value={fmtMoney(total.cpl)} />
        <KpiTile label="CPQL" value={fmtMoney(total.cpql)} />
        <KpiTile label="CPC" value={fmtMoney(total.cpc)} />
        <KpiTile label="Процент отказов" value={fmtOrDash(total.bounceRate, fmtPct)} />
        <KpiTile label="Глубина просмотра" value={fmtOrDash(total.pagesPerSession, fmtDecimal)} />
        <KpiTile
          label="Время на сайте"
          value={fmtOrDash(total.avgSessionDurationSec, fmtDuration)}
        />
      </div>

      <TrendChart data={trend} />
    </div>
  );
}
