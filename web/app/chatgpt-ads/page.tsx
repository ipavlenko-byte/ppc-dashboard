import { getDashboardData } from "@/lib/dataSource";
import { applyDateFilter } from "@/lib/metrics";
import { resolveDateFilter } from "@/lib/dateFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { KpiTile } from "@/components/KpiTile";
import { fmtInt, fmtPct, fmtDuration } from "@/lib/format";
import type { ChatgptAdsDailyRow } from "@/lib/types";

export const revalidate = 300;

interface Agg {
  name: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  engagementSec: number;
  keyEvents: number;
  firstDate: string;
  lastDate: string;
}

function aggregate(rows: ChatgptAdsDailyRow[], key: (r: ChatgptAdsDailyRow) => string): Agg[] {
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const k = key(r);
    const a = map.get(k) ?? {
      name: k,
      sessions: 0,
      users: 0,
      engagedSessions: 0,
      engagementSec: 0,
      keyEvents: 0,
      firstDate: r.date,
      lastDate: r.date,
    };
    a.sessions += r.sessions;
    a.users += r.users;
    a.engagedSessions += r.engagedSessions;
    a.engagementSec += r.engagementSec;
    a.keyEvents += r.keyEvents;
    if (r.date < a.firstDate) a.firstDate = r.date;
    if (r.date > a.lastDate) a.lastDate = r.date;
    map.set(k, a);
  }
  return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions);
}

const engagementRate = (a: { sessions: number; engagedSessions: number }) =>
  a.sessions > 0 ? a.engagedSessions / a.sessions : null;
// Среднее время вовлечённости на сессию = Σ секунд / Σ сессий — как в отчётах GA4.
const avgEngagement = (a: { sessions: number; engagementSec: number }) =>
  a.sessions > 0 ? a.engagementSec / a.sessions : null;

const HEAD = "border-b-2 border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-600";

const isUnresolvedMacro = (name: string) => name === "{campaign}" || name === "{campaign_id}";

export default async function ChatgptAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filter = resolveDateFilter(sp);
  const { chatgptAds, source } = await getDashboardData();

  const rows = applyDateFilter(chatgptAds, filter);
  const campaigns = aggregate(rows, (r) => r.campaign);
  const daily = aggregate(rows, (r) => r.date).sort((a, b) => b.name.localeCompare(a.name));
  const total = aggregate(rows, () => "ВСЕГО")[0];
  const hasUnresolved = campaigns.some((c) => isUnresolvedMacro(c.name));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ChatGPT Ads — {filter.label}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Трафик с utm_source=chatgpt_ads (Google Analytics, GA4). Расходы и показы OpenAI сюда не попадают — их нет
            в GA4.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {source === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Демо-данные (Sheet не подключён)
            </span>
          )}
          <DateRangePicker basePath="/chatgpt-ads" current={filter} />
        </div>
      </div>

      {!total ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных за этот период — если реклама уже идёт, запустите syncGa4 (см. SETUP.md)
        </div>
      ) : (
        <>
          {hasUnresolved && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              В части визитов вместо id кампании пришёл текст «{"{campaign}"}» — макрос в ссылке не подставился (в ссылке
              должно быть {"{campaign_id}"}, а не {"{campaign}"}). Проверьте шаблон URL в рекламном кабинете.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiTile label="Сессии" value={fmtInt(total.sessions)} />
            <KpiTile label="Пользователи" value={fmtInt(total.users)} />
            <KpiTile
              label="Вовлечённые сессии"
              value={engagementRate(total) === null ? "—" : fmtPct(engagementRate(total)!)}
              subValue={`${fmtInt(total.engagedSessions)} из ${fmtInt(total.sessions)}`}
            />
            <KpiTile
              label="Время на сайте"
              value={avgEngagement(total) === null ? "—" : fmtDuration(avgEngagement(total)!)}
              subValue="на сессию (как в GA4)"
            />
            <KpiTile label="Key events" value={fmtInt(total.keyEvents)} />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-600">По кампаниям (utm_campaign)</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[700px] text-sm tabular-nums">
                <thead>
                  <tr>
                    <th className={`${HEAD} text-left`}>Кампания</th>
                    <th className={`${HEAD} text-right`}>Сессии</th>
                    <th className={`${HEAD} text-right`}>Пользователи</th>
                    <th className={`${HEAD} text-right`}>Вовлечённость</th>
                    <th className={`${HEAD} text-right`}>Время на сайте</th>
                    <th className={`${HEAD} text-right`}>Key events</th>
                    <th className={`${HEAD} text-right`}>Период</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.name} className="border-b border-slate-100 hover:bg-blue-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {c.name || "(не задана)"}
                        {isUnresolvedMacro(c.name) && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 text-[11px] text-amber-800">
                            макрос не подставился
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmtInt(c.sessions)}</td>
                      <td className="px-4 py-2.5 text-right">{fmtInt(c.users)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {engagementRate(c) === null ? "—" : fmtPct(engagementRate(c)!)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {avgEngagement(c) === null ? "—" : fmtDuration(avgEngagement(c)!)}
                      </td>
                      <td className="px-4 py-2.5 text-right">{fmtInt(c.keyEvents)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                        {c.firstDate === c.lastDate ? c.firstDate : `${c.firstDate} – ${c.lastDate}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-600">По дням</h2>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr>
                    <th className={`${HEAD} sticky top-0 text-left`}>Дата</th>
                    <th className={`${HEAD} sticky top-0 text-right`}>Сессии</th>
                    <th className={`${HEAD} sticky top-0 text-right`}>Пользователи</th>
                    <th className={`${HEAD} sticky top-0 text-right`}>Вовлечённость</th>
                    <th className={`${HEAD} sticky top-0 text-right`}>Время на сайте</th>
                    <th className={`${HEAD} sticky top-0 text-right`}>Key events</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.name} className="border-b border-slate-100 hover:bg-blue-50/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{d.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmtInt(d.sessions)}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(d.users)}</td>
                      <td className="px-4 py-2 text-right">
                        {engagementRate(d) === null ? "—" : fmtPct(engagementRate(d)!)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {avgEngagement(d) === null ? "—" : fmtDuration(avgEngagement(d)!)}
                      </td>
                      <td className="px-4 py-2 text-right">{fmtInt(d.keyEvents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
