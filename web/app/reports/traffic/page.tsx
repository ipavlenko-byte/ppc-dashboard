import { getDashboardData } from "@/lib/dataSource";
import { fmtInt, fmtPct } from "@/lib/format";

export const revalidate = 300;

// Порядок строк в пивоте — фиксированный, чтобы таблица не "прыгала" между обновлениями.
const BUCKET_ORDER = [
  "Direct",
  "Search: Google",
  "Search: Other",
  "Ads: Google",
  "Ads: Other",
  "Websites",
  "AI",
  "Social Networks",
  "Other",
];

export default async function TrafficReportPage() {
  const { ga4Traffic, ga4TrafficSummary, source } = await getDashboardData();

  // Скрипт тянет ~13 месяцев (запас на дозревание текущего), показываем последние 12.
  const months = Array.from(new Set(ga4Traffic.map((r) => r.yearMonth)))
    .sort()
    .slice(-12);
  const usersByBucketMonth = new Map<string, number>();
  for (const r of ga4Traffic) {
    usersByBucketMonth.set(`${r.bucket}__${r.yearMonth}`, r.users);
  }
  const summaryByMonth = new Map(ga4TrafficSummary.map((r) => [r.yearMonth, r]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Traffic — последние {months.length || 12} мес.</h1>
          <p className="mt-1 text-sm text-slate-500">
            Пользователи по каналам, источник — Google Analytics (GA4).
          </p>
        </div>
        {source === "mock" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Демо-данные (Sheet не подключён)
          </span>
        )}
      </div>

      {months.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных — запустите syncTrafficByChannel в sync-ga4.gs (см. SETUP.md)
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-3">Канал</th>
                {months.map((m) => (
                  <th key={m} className="px-4 py-3 text-right">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUCKET_ORDER.map((bucket) => (
                <tr key={bucket} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{bucket}</td>
                  {months.map((m) => (
                    <td key={m} className="px-4 py-2.5 text-right text-slate-700">
                      {fmtInt(usersByBucketMonth.get(`${bucket}__${m}`) ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-slate-100 bg-emerald-50 font-semibold text-slate-900">
                <td className="px-4 py-3">Всего пользователей</td>
                {months.map((m) => (
                  <td key={m} className="px-4 py-3 text-right">
                    {fmtInt(summaryByMonth.get(m)?.totalUsers ?? 0)}
                  </td>
                ))}
              </tr>
              <tr className="font-semibold text-slate-900">
                <td className="px-4 py-3">Bounce rate</td>
                {months.map((m) => {
                  const br = summaryByMonth.get(m)?.bounceRate;
                  return (
                    <td key={m} className="px-4 py-3 text-right">
                      {br !== undefined ? fmtPct(br) : "—"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
