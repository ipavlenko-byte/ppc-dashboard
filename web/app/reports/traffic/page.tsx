import { TrafficBucketRows } from "@/components/TrafficBucketRows";
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

// Первая колонка и шапка закреплены (sticky), поэтому у каждой ячейки в них
// должен быть свой непрозрачный фон — иначе при скролле сквозь них будет
// просвечивать текст соседних колонок/строк.
const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function monthParts(ym: string): { name: string; year: string } {
  const [y, m] = ym.split("-");
  return { name: MONTH_NAMES[Number(m) - 1] ?? ym, year: y };
}

const HEAD_CELL = "sticky top-0 z-20 border-b-2 border-slate-200 bg-slate-100 px-4 py-3 text-slate-600";
const FIRST_COL_HEAD = `${HEAD_CELL} sticky left-0 z-30 text-left`;
const FIRST_COL_BODY = "sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 font-semibold text-slate-800";

export default async function TrafficReportPage() {
  const { ga4Traffic, ga4TrafficSources, ga4TrafficSummary, source } = await getDashboardData();

  // Скрипт тянет ~13 месяцев (запас на дозревание текущего), показываем последние 12.
  const months = Array.from(new Set(ga4Traffic.map((r) => r.yearMonth)))
    .sort()
    .slice(-12);
  const usersByBucketMonth = new Map<string, number>();
  for (const r of ga4Traffic) {
    usersByBucketMonth.set(`${r.bucket}__${r.yearMonth}`, r.users);
  }
  // Разбивка AI и соцсетей по источникам: источники отсортированы по сумме за период.
  const sourcesByBucket = new Map<string, string[]>();
  const usersBySourceMonth = new Map<string, number>();
  const sourceTotal = new Map<string, number>();
  for (const r of ga4TrafficSources) {
    usersBySourceMonth.set(`${r.bucket}__${r.source}__${r.yearMonth}`, r.users);
    const k = `${r.bucket}__${r.source}`;
    sourceTotal.set(k, (sourceTotal.get(k) ?? 0) + r.users);
  }
  for (const k of sourceTotal.keys()) {
    const [bucket, src] = k.split("__");
    sourcesByBucket.set(bucket, [...(sourcesByBucket.get(bucket) ?? []), src]);
  }
  for (const [bucket, list] of sourcesByBucket) {
    list.sort((a, b) => (sourceTotal.get(`${bucket}__${b}`) ?? 0) - (sourceTotal.get(`${bucket}__${a}`) ?? 0));
  }
  const summaryByMonth = new Map(ga4TrafficSummary.map((r) => [r.yearMonth, r]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Traffic — последние {months.length || 12} мес.</h1>
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
        <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
            <thead>
              <tr>
                <th className={`${FIRST_COL_HEAD} min-w-[200px]`}>Канал</th>
                {months.map((m) => (
                  <th
                    key={m}
                    className={`${HEAD_CELL} min-w-[92px] text-right ${m === months[months.length - 1] ? "!bg-blue-100 !text-blue-800" : ""}`}
                  >
                    <div className="text-sm font-bold">{monthParts(m).name}</div>
                    <div className="text-[11px] font-medium opacity-70">
                      {monthParts(m).year}
                      {m === months[months.length - 1] ? " · идёт" : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUCKET_ORDER.map((bucket) => (
                <TrafficBucketRows
                  key={bucket}
                  bucket={bucket}
                  values={months.map((m) => usersByBucketMonth.get(`${bucket}__${m}`) ?? 0)}
                  sources={(sourcesByBucket.get(bucket) ?? []).map((src) => ({
                    source: src,
                    values: months.map((m) => usersBySourceMonth.get(`${bucket}__${src}__${m}`) ?? 0),
                  }))}
                />
              ))}
              <tr className="border-b border-slate-100 bg-emerald-50 font-semibold text-slate-900">
                <td className={`${FIRST_COL_BODY} bg-emerald-50 py-3`}>Всего пользователей</td>
                {months.map((m) => (
                  <td key={m} className="px-4 py-3 text-right">
                    {fmtInt(summaryByMonth.get(m)?.totalUsers ?? 0)}
                  </td>
                ))}
              </tr>
              <tr className="font-semibold text-slate-900">
                <td className={`${FIRST_COL_BODY} py-3`}>Bounce rate</td>
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
