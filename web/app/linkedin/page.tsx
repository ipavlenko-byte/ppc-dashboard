import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { GroupFilter } from "@/components/GroupFilter";

export const revalidate = 300;

export default async function LinkedInPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; group?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);
  const group = sp.group ?? "";

  const { linkedInAds, source } = await getDashboardData();

  const groups = Array.from(new Set(linkedInAds.map((r) => r.campaignGroup).filter(Boolean))).sort();

  const filtered = applyDateFilter(
    group ? linkedInAds.filter((r) => r.campaignGroup === group) : linkedInAds,
    filter
  );
  const summaries = summarizeGeneric(filtered, (r) => r.campaign);
  const total = grandTotalGeneric(summaries);

  const linkQuery =
    filter.mode === "range" ? `from=${filter.from}&to=${filter.to}` : `days=${filter.days}`;

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
          <GroupFilter groups={groups} current={group} filter={filter} basePath="/linkedin" />
          <DateRangePicker basePath="/linkedin" current={filter} extraParams={group ? { group } : undefined} />
        </div>
      </div>
      {summaries.length === 0 && source === "sheets" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных — синк ещё не запускался (см. SETUP.md, раздел LinkedIn Ads)
        </div>
      ) : (
        <MetricsTable
          rows={summaries}
          total={total}
          nameLabel="Кампания"
          linkFor={(campaign) => `/linkedin/${encodeURIComponent(campaign)}?${linkQuery}`}
        />
      )}
    </div>
  );
}
