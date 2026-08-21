import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

export default async function AdGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaign: string; adgroup: string }>;
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const { campaign: campaignParam, adgroup: adGroupParam } = await params;
  const campaign = decodeURIComponent(campaignParam);
  const adGroup = decodeURIComponent(adGroupParam);
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);
  const basePath = `/campaigns/${encodeURIComponent(campaign)}/${encodeURIComponent(adGroup)}`;

  const { keywords, adCreatives } = await getDashboardData();

  const keywordRows = applyDateFilter(
    keywords.filter((r) => r.campaign === campaign && r.adGroup === adGroup),
    filter
  );
  const keywordSummaries = summarizeGeneric(
    keywordRows,
    (r) => `${r.keyword} · ${r.matchType}`
  );
  const keywordTotal = grandTotalGeneric(keywordSummaries);

  const adRows = applyDateFilter(
    adCreatives.filter((r) => r.campaign === campaign && r.adGroup === adGroup),
    filter
  );
  const adSummaries = summarizeGeneric(adRows, (r) => `${r.adId} · ${r.adType}`);
  const adTotal = grandTotalGeneric(adSummaries);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign, href: `/campaigns/${encodeURIComponent(campaign)}` },
          { label: adGroup },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{adGroup} — {filter.label}</h1>
        <DateRangePicker basePath={basePath} current={filter} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-600">Ключевые слова</h2>
        <MetricsTable rows={keywordSummaries} total={keywordTotal} nameLabel="Ключевое слово" />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-600">Объявления</h2>
        <MetricsTable rows={adSummaries} total={adTotal} nameLabel="Объявление" />
      </div>
    </div>
  );
}
