import { getDashboardData } from "@/lib/dataSource";
import { grandTotal, dailyTrend, filterByDays } from "@/lib/metrics";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { DateRangePicker, parseDays } from "@/components/DateRangePicker";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";

export const revalidate = 300; // пересчёт кэша раз в 5 минут

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = parseDays(daysParam);

  const { rows: allRows, source } = await getDashboardData();
  const rows = filterByDays(allRows, days);
  const total = grandTotal(rows);
  const trend = dailyTrend(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview — последние {days} дней</h1>
        <div className="flex items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <DateRangePicker basePath="/" currentDays={days} />
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
      </div>

      <TrendChart data={trend} />
    </div>
  );
}
