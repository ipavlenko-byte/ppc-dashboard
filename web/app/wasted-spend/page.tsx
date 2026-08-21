import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { CampaignFilter } from "@/components/CampaignFilter";
import { MinCostFilter } from "@/components/MinCostFilter";

export const revalidate = 300;

const DEFAULT_MIN_COST = 50;

export default async function WastedSpendPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; campaign?: string; minCost?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);
  const campaign = sp.campaign ?? "";
  const minCost = Number(sp.minCost ?? DEFAULT_MIN_COST) || 0;

  const { searchTerms } = await getDashboardData();
  const campaigns = Array.from(new Set(searchTerms.map((r) => r.campaign))).sort();

  const filtered = applyDateFilter(
    campaign ? searchTerms.filter((r) => r.campaign === campaign) : searchTerms,
    filter
  );
  const allSummaries = summarizeGeneric(filtered, (r) => r.searchTerm);
  const wasted = allSummaries.filter((s) => s.conversions === 0 && s.cost >= minCost);
  const total = grandTotalGeneric(wasted);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Слив бюджета — {filter.label}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Поисковые запросы с тратами ≥ HK${minCost} и без единой заявки — кандидаты в минус-слова.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MinCostFilter currentMinCost={minCost} />
          <CampaignFilter
            campaigns={campaigns}
            current={campaign}
            filter={filter}
            basePath="/wasted-spend"
            extraParams={minCost !== DEFAULT_MIN_COST ? { minCost: String(minCost) } : undefined}
          />
          <DateRangePicker
            basePath="/wasted-spend"
            current={filter}
            extraParams={{
              ...(campaign ? { campaign } : {}),
              ...(minCost !== DEFAULT_MIN_COST ? { minCost: String(minCost) } : {}),
            }}
          />
        </div>
      </div>
      <MetricsTable rows={wasted} total={total} nameLabel="Поисковый запрос" />
    </div>
  );
}
