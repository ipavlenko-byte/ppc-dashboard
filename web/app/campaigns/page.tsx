import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal, filterByDays } from "@/lib/metrics";
import { CampaignsTable } from "@/components/CampaignsTable";
import { DateRangePicker, parseDays } from "@/components/DateRangePicker";

export const revalidate = 300;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = parseDays(daysParam);

  const { rows: allRows } = await getDashboardData();
  const rows = filterByDays(allRows, days);
  const summaries = summarizeByCampaign(rows);
  const total = grandTotal(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Кампании — последние {days} дней</h1>
        <DateRangePicker basePath="/campaigns" currentDays={days} />
      </div>
      <CampaignsTable
        rows={summaries}
        total={total}
        linkFor={(campaign) => `/campaigns/${encodeURIComponent(campaign)}?days=${days}`}
      />
    </div>
  );
}
