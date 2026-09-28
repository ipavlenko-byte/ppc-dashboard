import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal, filterByRange } from "@/lib/metrics";
import { CampaignsTable } from "@/components/CampaignsTable";

export const revalidate = 300;

const WEEKS_TO_SHOW = 5;

interface WeekBounds {
  label: string;
  from: string;
  to: string;
}

// Недели пн-вс, текущая (возможно неполная) неделя — первая в списке, дальше в прошлое.
function lastWeeks(n: number): WeekBounds[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=вс..6=сб
  const diffToMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - diffToMonday);

  const weeks: WeekBounds[] = [];
  for (let i = 0; i < n; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const from = monday.toISOString().slice(0, 10);
    const to = sunday.toISOString().slice(0, 10);
    weeks.push({ label: `${from} – ${to}`, from, to });
  }
  return weeks;
}

export default async function AdsWeeklyReportPage() {
  const { rows: allRows, source } = await getDashboardData();
  const weeks = lastWeeks(WEEKS_TO_SHOW);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Google Ads по неделям</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ретроспектива последних {WEEKS_TO_SHOW} недель (пн–вс), текущая неделя — сверху.
          </p>
        </div>
        {source === "mock" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Демо-данные (Sheet не подключён)
          </span>
        )}
      </div>

      {weeks.map((w) => {
        const rows = filterByRange(allRows, w.from, w.to);
        const summaries = summarizeByCampaign(rows);
        const total = grandTotal(rows);
        return (
          <div key={w.from} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-600">{w.label}</h2>
            {summaries.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
                Нет данных за эту неделю
              </div>
            ) : (
              <CampaignsTable rows={summaries} total={total} />
            )}
          </div>
        );
      })}
    </div>
  );
}
