import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

export default async function CampaignAdGroupsPage({
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

  const { adGroups } = await getDashboardData();
  const rows = applyDateFilter(
    adGroups.filter((r) => r.campaign === campaign),
    filter
  );
  const summaries = summarizeGeneric(rows, (r) => r.adGroup);
  const total = grandTotalGeneric(summaries);

  const linkQuery =
    filter.mode === "range" ? `from=${filter.from}&to=${filter.to}` : `days=${filter.days}`;
  const basePath = `/campaigns/${encodeURIComponent(campaign)}`;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Campaigns", href: "/campaigns" }, { label: campaign }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Группы объявлений — {filter.label}</h1>
        <DateRangePicker basePath={basePath} current={filter} />
      </div>
      <MetricsTable
        rows={summaries}
        total={total}
        nameLabel="Группа объявлений"
        linkFor={(adGroup) => `${basePath}/${encodeURIComponent(adGroup)}?${linkQuery}`}
      />
    </div>
  );
}
