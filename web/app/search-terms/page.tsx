import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { CampaignFilter } from "@/components/CampaignFilter";

export const revalidate = 300;

export default async function SearchTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; campaign?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);
  const campaign = sp.campaign ?? "";

  const { searchTerms } = await getDashboardData();
  const campaigns = Array.from(new Set(searchTerms.map((r) => r.campaign))).sort();

  const filtered = applyDateFilter(
    campaign ? searchTerms.filter((r) => r.campaign === campaign) : searchTerms,
    filter
  );
  const summaries = summarizeGeneric(filtered, (r) => r.searchTerm);
  const total = grandTotalGeneric(summaries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Поисковые запросы — {filter.label}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <CampaignFilter campaigns={campaigns} current={campaign} filter={filter} />
          <DateRangePicker
            basePath="/search-terms"
            current={filter}
            extraParams={campaign ? { campaign } : undefined}
          />
        </div>
      </div>
      <MetricsTable rows={summaries} total={total} nameLabel="Поисковый запрос" />
    </div>
  );
}
