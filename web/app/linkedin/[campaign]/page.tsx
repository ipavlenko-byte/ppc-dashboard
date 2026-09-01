import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { fmtInt } from "@/lib/format";

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

  const { linkedInCreatives, linkedInTargeting, linkedInAudience } = await getDashboardData();

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

  const audience = linkedInAudience.filter((r) => r.campaign === campaign);
  const audienceByDimension = new Map<string, typeof audience>();
  for (const a of audience) {
    const list = audienceByDimension.get(a.dimension) ?? [];
    list.push(a);
    audienceByDimension.set(a.dimension, list);
  }
  for (const list of audienceByDimension.values()) {
    list.sort((a, b) => b.impressions - a.impressions);
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

      {audienceByDimension.size > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-600">
            Кто нас реально видит — фактический охват за последние дни синка
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from(audienceByDimension.entries()).map(([dimension, rows]) => (
              <div key={dimension} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{dimension}</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {rows.slice(0, 8).map((r) => (
                    <div key={r.value} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-slate-700" title={r.value}>
                        {r.value}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{fmtInt(r.impressions)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
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
