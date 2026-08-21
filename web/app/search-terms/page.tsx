import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, filterByDays } from "@/lib/metrics";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker, parseDays } from "@/components/DateRangePicker";
import { CampaignFilter } from "@/components/CampaignFilter";

export const revalidate = 300;

export default async function SearchTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; campaign?: string }>;
}) {
  const { days: daysParam, campaign: campaignParam } = await searchParams;
  const days = parseDays(daysParam);
  const campaign = campaignParam ?? "";

  const { searchTerms } = await getDashboardData();
  const campaigns = Array.from(new Set(searchTerms.map((r) => r.campaign))).sort();

  const filtered = filterByDays(
    campaign ? searchTerms.filter((r) => r.campaign === campaign) : searchTerms,
    days
  );
  const summaries = summarizeGeneric(filtered, (r) => r.searchTerm);
  const total = grandTotalGeneric(summaries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Поисковые запросы — последние {days} дней</h1>
        <div className="flex items-center gap-3">
          <CampaignFilter campaigns={campaigns} current={campaign} days={days} />
          <DateRangePicker
            basePath="/search-terms"
            currentDays={days}
            extraParams={campaign ? { campaign } : undefined}
          />
        </div>
      </div>
      <MetricsTable rows={summaries} total={total} nameLabel="Поисковый запрос" />
    </div>
  );
}
