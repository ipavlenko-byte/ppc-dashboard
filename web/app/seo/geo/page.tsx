import { getDashboardData } from "@/lib/dataSource";
import { summarizeSeo, grandTotalSeo, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { SeoTable } from "@/components/SeoTable";
import { DateRangePicker } from "@/components/DateRangePicker";

export const revalidate = 300;

export default async function SeoGeoPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { gscCountries, source } = await getDashboardData();

  const filtered = applyDateFilter(gscCountries, filter);
  const summaries = summarizeSeo(filtered, (r) => r.country);
  const total = grandTotalSeo(summaries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">SEO: география — {filter.label}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <DateRangePicker basePath="/seo/geo" current={filter} />
        </div>
      </div>
      <SeoTable rows={summaries} total={total} nameLabel="Страна" />
    </div>
  );
}
