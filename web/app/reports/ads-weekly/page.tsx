import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal, filterByRange } from "@/lib/metrics";
import { CampaignsTable } from "@/components/CampaignsTable";
import { fmtInt, fmtMoney } from "@/lib/format";

export const revalidate = 300;

const WEEKS_TO_SHOW = 5;
const MONTHS_RU = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

interface WeekBounds {
  from: string;
  to: string;
  title: string; // "28 сен – 4 окт 2026"
  tag: string; // "Текущая неделя" / "Прошлая неделя" / "3 нед. назад"
  weekNumber: number;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ISO-номер недели (пн-вс), как в календарях.
function isoWeekNumber(monday: Date): number {
  const t = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

function rangeTitle(a: Date, b: Date): string {
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTHS_RU[a.getMonth()]}`;
  return `${left} – ${b.getDate()} ${MONTHS_RU[b.getMonth()]} ${b.getFullYear()}`;
}

// Недели пн-вс, текущая (возможно неполная) неделя — первая в списке, дальше в прошлое.
function lastWeeks(n: number): WeekBounds[] {
  const today = new Date();
  const diffToMonday = (today.getDay() + 6) % 7;
  const currentMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);

  const weeks: WeekBounds[] = [];
  for (let i = 0; i < n; i++) {
    const monday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - i * 7);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    weeks.push({
      from: iso(monday),
      to: iso(sunday),
      title: rangeTitle(monday, sunday),
      tag: i === 0 ? "Текущая неделя" : i === 1 ? "Прошлая неделя" : `${i} нед. назад`,
      weekNumber: isoWeekNumber(monday),
    });
  }
  return weeks;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-1.5 ring-1 ring-slate-200">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

export default async function AdsWeeklyReportPage() {
  const { rows: allRows, source } = await getDashboardData();
  const weeks = lastWeeks(WEEKS_TO_SHOW);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Google Ads по неделям</h1>
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

      {weeks.map((w, i) => {
        const rows = filterByRange(allRows, w.from, w.to);
        const summaries = summarizeByCampaign(rows);
        const total = grandTotal(rows);
        const cpl = total.conversions > 0 ? total.cost / total.conversions : null;
        const current = i === 0;
        return (
          <section
            key={w.from}
            className={`overflow-hidden rounded-xl border shadow-sm ${current ? "border-blue-300" : "border-slate-200"}`}
          >
            <div
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
                current ? "bg-gradient-to-r from-blue-600/10 to-blue-50" : "bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">{w.title}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    current ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {w.tag}
                </span>
                <span className="text-xs text-slate-400">неделя {w.weekNumber}</span>
              </div>
              {summaries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Kpi label="Затраты" value={fmtMoney(total.cost)} />
                  <Kpi label="Клики" value={fmtInt(total.clicks)} />
                  <Kpi label="Заявки" value={fmtInt(total.conversions)} />
                  <Kpi label="CPL" value={cpl === null ? "—" : fmtMoney(cpl)} />
                </div>
              )}
            </div>
            <div className="bg-white p-3">
              {summaries.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">Нет данных за эту неделю</div>
              ) : (
                <CampaignsTable rows={summaries} total={total} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
