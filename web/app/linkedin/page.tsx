import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";

export const revalidate = 300;

export default async function LinkedInPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { linkedInAds, source } = await getDashboardData();
  const filtered = applyDateFilter(linkedInAds, filter);
  const summaries = summarizeGeneric(filtered, (r) => r.campaign);
  const total = grandTotalGeneric(summaries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">LinkedIn Ads — {filter.label}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <DateRangePicker basePath="/linkedin" current={filter} />
        </div>
      </div>
      {summaries.length === 0 && source === "sheets" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных — синк ещё не запускался (см. SETUP.md, раздел LinkedIn Ads)
        </div>
      ) : (
        <MetricsTable rows={summaries} total={total} nameLabel="Кампания" />
      )}
    </div>
  );
}
