import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal, filterByRange } from "@/lib/metrics";
import { MonthPicker } from "@/components/MonthPicker";
import { CampaignsTable } from "@/components/CampaignsTable";

export const revalidate = 300;

function lastMonths(n: number): string[] {
  const today = new Date();
  const months: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function monthBounds(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default async function AdsMonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const months = lastMonths(12);
  const month = sp.month && months.includes(sp.month) ? sp.month : months[0];

  const { rows: allRows, source } = await getDashboardData();
  const { from, to } = monthBounds(month);
  const rows = filterByRange(allRows, from, to);
  const summaries = summarizeByCampaign(rows);
  const total = grandTotal(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Google Ads помесячно — {month}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <MonthPicker months={months} current={month} basePath="/reports/ads-monthly" />
        </div>
      </div>
      <CampaignsTable rows={summaries} total={total} />
    </div>
  );
}
