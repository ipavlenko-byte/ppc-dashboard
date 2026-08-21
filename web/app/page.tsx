import { getDashboardData } from "@/lib/dataSource";
import { grandTotal, dailyTrend } from "@/lib/metrics";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";

export const revalidate = 300; // пересчёт кэша раз в 5 минут

export default async function DashboardPage() {
  const { rows, source } = await getDashboardData();
  const total = grandTotal(rows);
  const trend = dailyTrend(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview — последние 30 дней</h1>
        {source === "mock" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Демо-данные (Sheet не подключён)
          </span>
        )}
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
