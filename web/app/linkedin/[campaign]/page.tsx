import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

export default async function LinkedInCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaign: string }>;
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const { campaign: campaignParam } = await params;
  const campaign = decodeURIComponent(campaignParam);
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);

  const { linkedInCreatives, linkedInTargeting } = await getDashboardData();

  const rows = applyDateFilter(
    linkedInCreatives.filter((r) => r.campaign === campaign),
    filter
  );
  const summaries = summarizeGeneric(rows, (r) => r.creative);
  const total = grandTotalGeneric(summaries);

  const targeting = linkedInTargeting.filter((r) => r.campaign === campaign);
  const targetingByFacet = new Map<string, string[]>();
  for (const t of targeting) {
    const list = targetingByFacet.get(t.facetType) ?? [];
    list.push(t.value);
    targetingByFacet.set(t.facetType, list);
  }

  const basePath = `/linkedin/${encodeURIComponent(campaign)}`;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "LinkedIn Ads", href: "/linkedin" }, { label: campaign }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Креативы — {filter.label}</h1>
        <DateRangePicker basePath={basePath} current={filter} />
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных за выбранный период
        </div>
      ) : (
        <MetricsTable rows={summaries} total={total} nameLabel="Креатив" />
      )}

      {targetingByFacet.size > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-600">Таргетинг аудитории</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from(targetingByFacet.entries()).map(([facetType, values]) => (
              <div key={facetType} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {facetType}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {values.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
