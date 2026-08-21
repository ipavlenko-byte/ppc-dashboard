import { getDashboardData } from "@/lib/dataSource";
import {
  summarizeByCampaign,
  applyDateFilter,
  getPeriodBounds,
  getMonthToDateInfo,
  filterByRange,
} from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { KpiTile } from "@/components/KpiTile";
import { fmtMoneyDual, fmtMoney, fmtUsd, fmtInt, fmtPct, fmtOrDash, HKD_PER_USD } from "@/lib/format";

export const revalidate = 300;

// Общий лимит трат на аккаунт в месяц. Пока захардкожен — если понадобится
// менять чаще или иметь разные лимиты на аккаунт, вынести в env-переменную.
const MONTHLY_LIMIT_USD = 2200;

export default async function BudgetPacingPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { rows: allRows } = await getDashboardData();
  const rows = applyDateFilter(allRows, filter);
  const summaries = summarizeByCampaign(rows);

  const bounds = getPeriodBounds(allRows, filter);
  const days = bounds
    ? Math.round((new Date(bounds.to).getTime() - new Date(bounds.from).getTime()) / 86_400_000) + 1
    : 1;

  const pacing = summaries
    .filter((s) => s.dailyBudget !== null)
    .map((s) => {
      const avgDailySpend = s.cost / days;
      const usage = s.dailyBudget ? avgDailySpend / s.dailyBudget : null;
      return { campaign: s.campaign, dailyBudget: s.dailyBudget as number, avgDailySpend, usage };
    })
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0));

  const mtd = getMonthToDateInfo(allRows);
  const monthlyLimitHkd = MONTHLY_LIMIT_USD * HKD_PER_USD;
  let monthly: {
    spent: number;
    avgDailySpend: number;
    projectedTotal: number;
    remaining: number;
    status: "ok" | "warning" | "critical";
  } | null = null;

  if (mtd) {
    const monthRows = filterByRange(allRows, mtd.monthStart, mtd.today);
    const spent = monthRows.reduce((sum, r) => sum + r.cost, 0);
    const avgDailySpend = mtd.daysElapsed > 0 ? spent / mtd.daysElapsed : 0;
    const projectedTotal = spent + avgDailySpend * mtd.daysRemaining;
    const remaining = monthlyLimitHkd - spent;
    const status =
      projectedTotal > monthlyLimitHkd ? "critical" : projectedTotal > monthlyLimitHkd * 0.9 ? "warning" : "ok";
    monthly = { spent, avgDailySpend, projectedTotal, remaining, status };
  }

  const csvRows = pacing.map((p) => [
    p.campaign,
    p.dailyBudget,
    Math.round(p.avgDailySpend * 100) / 100,
    p.usage === null ? "" : `${(p.usage * 100).toFixed(1)}%`,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Пейсинг бюджета — {filter.label}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Средний дневной расход за период против дневного бюджета кампании.
          </p>
        </div>
        <DateRangePicker basePath="/budget-pacing" current={filter} />
      </div>

      {monthly && mtd && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-600">
            Месячный лимит аккаунта — {mtd.today.slice(0, 7)}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiTile
              label="Лимит на месяц"
              value={`$${MONTHLY_LIMIT_USD.toLocaleString("en-US")}`}
              subValue={fmtMoney(monthlyLimitHkd)}
            />
            <KpiTile
              label="Потрачено с начала месяца"
              value={fmtMoney(monthly.spent)}
              subValue={`≈${fmtUsd(monthly.spent)}`}
            />
            <KpiTile
              label="Остаток лимита"
              value={fmtMoney(monthly.remaining)}
              subValue={`≈${fmtUsd(monthly.remaining)}`}
            />
            <KpiTile
              label="Прогноз на конец месяца"
              value={fmtMoney(monthly.projectedTotal)}
              subValue={`≈${fmtUsd(monthly.projectedTotal)}`}
            />
            <KpiTile label="Осталось дней в месяце" value={fmtInt(mtd.daysRemaining)} />
          </div>
          <div
            className={
              monthly.status === "critical"
                ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                : monthly.status === "warning"
                  ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            }
          >
            {monthly.status === "critical" &&
              `🔴 При текущем темпе трат к концу месяца лимит будет превышен примерно на ${fmtMoney(monthly.projectedTotal - monthlyLimitHkd)} (≈${fmtUsd(monthly.projectedTotal - monthlyLimitHkd)}).`}
            {monthly.status === "warning" &&
              "🟡 При текущем темпе трат бюджет будет израсходован почти полностью к концу месяца."}
            {monthly.status === "ok" &&
              `🟢 При текущем темпе трат бюджета хватит до конца месяца, останется примерно ${fmtMoney(monthlyLimitHkd - monthly.projectedTotal)} (≈${fmtUsd(monthlyLimitHkd - monthly.projectedTotal)}).`}
          </div>
        </div>
      )}

      {pacing.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных о бюджете — запустите обновлённый sync-campaigns.js (см. SETUP.md)
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <ExportCsvButton
              filename="budget-pacing"
              headers={["Кампания", "Дневной бюджет", "Ср. расход/день", "Использование"]}
              rows={csvRows}
            />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-3">Кампания</th>
                  <th className="px-4 py-3 text-right">Дневной бюджет</th>
                  <th className="px-4 py-3 text-right">Ср. расход/день</th>
                  <th className="px-4 py-3 text-right">Использование</th>
                </tr>
              </thead>
              <tbody>
                {pacing.map((p) => {
                  const critical = p.usage !== null && p.usage >= 1.1;
                  const warning = p.usage !== null && !critical && p.usage >= 0.95;
                  return (
                    <tr
                      key={p.campaign}
                      className={
                        critical
                          ? "border-b border-slate-100 bg-red-50 hover:bg-red-100"
                          : warning
                            ? "border-b border-slate-100 bg-amber-50 hover:bg-amber-100"
                            : "border-b border-slate-100 hover:bg-slate-50"
                      }
                      title={
                        critical
                          ? "Расход стабильно выше дневного бюджета — кампания, вероятно, теряет показы"
                          : warning
                            ? "Расход близок к дневному бюджету"
                            : ""
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        <span className="flex items-center gap-1.5">
                          {critical && <span aria-hidden>🔴</span>}
                          {warning && <span aria-hidden>🟡</span>}
                          {p.campaign}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {fmtMoneyDual(p.dailyBudget)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {fmtMoneyDual(p.avgDailySpend)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {fmtOrDash(p.usage, fmtPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
