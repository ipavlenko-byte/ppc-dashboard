import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal } from "@/lib/metrics";
import { CampaignsTable } from "@/components/CampaignsTable";

export const revalidate = 300;

export default async function CampaignsPage() {
  const { rows } = await getDashboardData();
  const summaries = summarizeByCampaign(rows);
  const total = grandTotal(rows);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Кампании — последние 30 дней</h1>
      <CampaignsTable rows={summaries} total={total} />
    </div>
  );
}
