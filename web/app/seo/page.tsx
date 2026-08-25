import { getDashboardData } from "@/lib/dataSource";
import { summarizeSeo, grandTotalSeo, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { SeoTable } from "@/components/SeoTable";
import { KpiTile } from "@/components/KpiTile";
import { DateRangePicker } from "@/components/DateRangePicker";
import { fmtInt, fmtPct, fmtDecimal } from "@/lib/format";

export const revalidate = 300;

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { gscQueries, gscPages, source } = await getDashboardData();

  const filteredQueries = applyDateFilter(gscQueries, filter);
  const filteredPages = applyDateFilter(gscPages, filter);

  const queries = summarizeSeo(filteredQueries, (r) => r.query);
  const pages = summarizeSeo(filteredPages, (r) => r.page);
  // Общие KPI считаем по queries — сумма показов/кликов по запросам и по страницам
  // совпадает (это одни и те же клики GSC, просто в двух разрезах).
  const total = grandTotalSeo(queries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">SEO — {filter.label}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <DateRangePicker basePath="/seo" current={filter} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Показы" value={fmtInt(total.impressions)} />
        <KpiTile label="Клики" value={fmtInt(total.clicks)} />
        <KpiTile label="CTR" value={fmtPct(total.ctr)} />
        <KpiTile label="Средняя позиция" value={fmtDecimal(total.position)} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-600">Топ запросов</h2>
        <SeoTable rows={queries} total={total} nameLabel="Запрос" />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-600">Топ страниц</h2>
        <SeoTable rows={pages} total={grandTotalSeo(pages)} nameLabel="Страница" />
      </div>
    </div>
  );
}
