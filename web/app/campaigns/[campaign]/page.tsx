import { getDashboardData } from "@/lib/dataSource";
import { summarizeGeneric, grandTotalGeneric, filterByDays } from "@/lib/metrics";
import { MetricsTable } from "@/components/MetricsTable";
import { DateRangePicker, parseDays } from "@/components/DateRangePicker";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

export default async function CampaignAdGroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaign: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { campaign: campaignParam } = await params;
  const campaign = decodeURIComponent(campaignParam);
  const { days: daysParam } = await searchParams;
  const days = parseDays(daysParam);

  const { adGroups } = await getDashboardData();
  const rows = filterByDays(
    adGroups.filter((r) => r.campaign === campaign),
    days
  );
  const summaries = summarizeGeneric(rows, (r) => r.adGroup);
  const total = grandTotalGeneric(summaries);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Campaigns", href: "/campaigns" }, { label: campaign }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Группы объявлений — последние {days} дней</h1>
        <DateRangePicker basePath={`/campaigns/${encodeURIComponent(campaign)}`} currentDays={days} />
      </div>
      <MetricsTable
        rows={summaries}
        total={total}
        nameLabel="Группа объявлений"
        linkFor={(adGroup) =>
          `/campaigns/${encodeURIComponent(campaign)}/${encodeURIComponent(adGroup)}?days=${days}`
        }
      />
    </div>
  );
}
