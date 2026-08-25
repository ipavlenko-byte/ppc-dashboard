import { getDashboardData } from "@/lib/dataSource";
import {
  summarizeSeo,
  grandTotalSeo,
  applyDateFilter,
  filterByRange,
  getPeriodBounds,
  getPreviousPeriodBounds,
  seoDailyTrend,
} from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { fmtDeltaPct } from "@/lib/trends";
import { SeoTable } from "@/components/SeoTable";
import { SeoTrendChart } from "@/components/SeoTrendChart";
import { KpiTile } from "@/components/KpiTile";
import { DateRangePicker } from "@/components/DateRangePicker";
import { CountryFilter } from "@/components/CountryFilter";
import { fmtInt, fmtPct, fmtDecimal } from "@/lib/format";

export const revalidate = 300;

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);
  const country = sp.country ?? "";

  const { gscQueries, gscPages, gscCountries, gscQueryCountry, source } = await getDashboardData();

  const countries = Array.from(new Set(gscCountries.map((r) => r.country))).sort();

  // Без выбранной страны — дешёвый плоский отчёт по запросам (как раньше).
  // С выбранной страной — комбинированный date+query+country отчёт, отфильтрованный по ней.
  const queryRows = country ? gscQueryCountry.filter((r) => r.country === country) : gscQueries;

  const filteredQueries = applyDateFilter(queryRows, filter);
  const filteredPages = applyDateFilter(gscPages, filter);

  const queries = summarizeSeo(filteredQueries, (r) => r.query);
  const pages = summarizeSeo(filteredPages, (r) => r.page);
  const total = grandTotalSeo(queries);

  // Сравнение с предыдущим периодом той же длины — как в Campaigns.
  // Если в этом диапазоне вообще нет строк (например, данные ещё не накопились
  // так глубоко), previousTotal остаётся null — дельты на тайлах не показываем,
  // а не выводим обманчивые "-100%" от нулевой базы.
  const bounds = getPeriodBounds(queryRows, filter);
  const previousTotal = bounds
    ? (() => {
        const prev = getPreviousPeriodBounds(bounds);
        const prevRows = filterByRange(queryRows, prev.from, prev.to);
        const prevSummary = grandTotalSeo(summarizeSeo(prevRows, (r) => r.query));
        return prevSummary.impressions > 0 ? prevSummary : null;
      })()
    : null;

  const trend = seoDailyTrend(filteredQueries);

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
          <CountryFilter countries={countries} current={country} filter={filter} basePath="/seo" />
          <DateRangePicker basePath="/seo" current={filter} extraParams={country ? { country } : undefined} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Показы"
          value={fmtInt(total.impressions)}
          subValue={previousTotal ? fmtDeltaPct(total.impressions, previousTotal.impressions) : undefined}
        />
        <KpiTile
          label="Клики"
          value={fmtInt(total.clicks)}
          subValue={previousTotal ? fmtDeltaPct(total.clicks, previousTotal.clicks) : undefined}
        />
        <KpiTile
          label="CTR"
          value={fmtPct(total.ctr)}
          subValue={previousTotal ? fmtDeltaPct(total.ctr, previousTotal.ctr) : undefined}
        />
        <KpiTile
          label="Средняя позиция"
          value={fmtDecimal(total.position)}
          // Для позиции "рост" — это уменьшение числа, поэтому дельту считаем в обратную сторону.
          subValue={previousTotal ? fmtDeltaPct(previousTotal.position, total.position) : undefined}
        />
      </div>

      <SeoTrendChart data={trend} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-600">
          Топ запросов{country ? ` — ${country}` : ""}
        </h2>
        <SeoTable rows={queries} total={total} nameLabel="Запрос" />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-600">Топ страниц (по всем странам)</h2>
        <SeoTable rows={pages} total={grandTotalSeo(pages)} nameLabel="Страница" />
      </div>
    </div>
  );
}
