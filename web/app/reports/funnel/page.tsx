import { getDashboardData } from "@/lib/dataSource";
import { summarizeFunnelByMonth } from "@/lib/funnel";
import { LeadTrendChart } from "@/components/LeadTrendChart";
import { fmtInt, fmtOrDash, fmtDecimal } from "@/lib/format";

export const revalidate = 300;

const SOURCE_ORDER = ["Google CPC", "Organic", "Direct", "Referral", "AI", "Other"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtCr(v: number | null) {
  return fmtOrDash(v, (n) => `${fmtDecimal(n)}%`);
}

// Первая колонка и шапка закреплены (sticky) — у каждой ячейки в них свой
// непрозрачный фон, иначе при скролле сквозь них просвечивают соседние строки/колонки.
const HEAD_CELL = "sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500";
const FIRST_COL_HEAD = `${HEAD_CELL} sticky left-0 z-30 text-left`;

// Три уровня визуальной иерархии строк: главные метрики (Users/Leads/...) —
// самые заметные; разбивка по источникам — приглушённая и мельче; CR% —
// компактные пояснительные строки между ними.
const mainRowFirstCol = (bg: string) => `sticky left-0 z-10 ${bg} px-4 py-2.5 font-semibold text-slate-900`;
const sourceRowFirstCol = "sticky left-0 z-10 bg-white px-4 py-1.5 pl-7 text-slate-500";
const crRowFirstCol = "sticky left-0 z-10 bg-white px-4 py-1.5 pl-7 text-xs italic text-slate-400";

export default async function FunnelReportPage() {
  const { funnelMonthly, funnelLeadsMonthly, source } = await getDashboardData();
  const summaries = summarizeFunnelByMonth(funnelMonthly, funnelLeadsMonthly);
  const months = summaries.map((s) => s.month);

  const sourcesInData = Array.from(new Set(funnelLeadsMonthly.map((r) => r.source)));
  const sources = sourcesInData.sort((a, b) => {
    const ai = SOURCE_ORDER.indexOf(a);
    const bi = SOURCE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const bySourceMap = (month: string, src: string, field: "leads" | "qualifiedLeads") =>
    summaries.find((s) => s.month === month)?.bySource.find((b) => b.source === src)?.[field] ?? 0;

  // Год→месяц пивот для графика (одна линия на год, ось X — месяц).
  const years = Array.from(new Set(months.map((m) => m.slice(0, 4)))).sort();
  const buildYearlyData = (pick: (s: (typeof summaries)[number]) => number) =>
    MONTH_LABELS.map((label, i) => {
      const row: Record<string, number | string> = { monthLabel: label };
      for (const year of years) {
        const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
        const s = summaries.find((x) => x.month === monthKey);
        if (s) row[year] = pick(s);
      }
      return row;
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Воронка сайта</h1>
          <p className="mt-1 text-sm text-slate-500">
            Данные из CRM — заполняются вручную в Google Sheet (funnel_monthly / funnel_leads_monthly).
          </p>
        </div>
        {source === "mock" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Демо-данные (Sheet не подключён)
          </span>
        )}
      </div>

      {months.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm">
          Нет данных — заполните funnel_monthly и funnel_leads_monthly (см. SETUP.md)
        </div>
      ) : (
        <>
          <div className="max-h-[75vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
              <thead>
                <tr>
                  <th className={`${FIRST_COL_HEAD} min-w-[180px]`}>Метрика</th>
                  {months.map((m) => (
                    <th key={m} className={`${HEAD_CELL} min-w-[84px] text-right`}>
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-slate-100">
                  <td className={mainRowFirstCol("bg-slate-100")}>Users</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {fmtInt(s.users)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className={crRowFirstCol}>CR1 = leads / users</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-1.5 text-right text-xs italic text-slate-400">
                      {fmtCr(s.cr1)}
                    </td>
                  ))}
                </tr>

                <tr className="border-b border-slate-100 bg-slate-100">
                  <td className={mainRowFirstCol("bg-slate-100")}>Leads</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {fmtInt(s.totalLeads)}
                    </td>
                  ))}
                </tr>
                {sources.map((src) => (
                  <tr key={`leads-${src}`} className="border-b border-slate-50">
                    <td className={sourceRowFirstCol}>{src}</td>
                    {months.map((m) => (
                      <td key={m} className="px-4 py-1.5 text-right text-slate-500">
                        {fmtInt(bySourceMap(m, src, "leads"))}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="border-b border-slate-100">
                  <td className={crRowFirstCol}>CR2 = qualified / leads</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-1.5 text-right text-xs italic text-slate-400">
                      {fmtCr(s.cr2)}
                    </td>
                  ))}
                </tr>

                <tr className="border-b border-slate-100 bg-slate-100">
                  <td className={mainRowFirstCol("bg-slate-100")}>Qualified leads</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {fmtInt(s.totalQualifiedLeads)}
                    </td>
                  ))}
                </tr>
                {sources.map((src) => (
                  <tr key={`qual-${src}`} className="border-b border-slate-50">
                    <td className={sourceRowFirstCol}>{src}</td>
                    {months.map((m) => (
                      <td key={m} className="px-4 py-1.5 text-right text-slate-500">
                        {fmtInt(bySourceMap(m, src, "qualifiedLeads"))}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="border-b border-slate-100">
                  <td className={crRowFirstCol}>CR3 = clients / qualified</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-1.5 text-right text-xs italic text-slate-400">
                      {fmtCr(s.cr3)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-emerald-50">
                  <td className={mainRowFirstCol("bg-emerald-50")}>Clients</td>
                  {summaries.map((s) => (
                    <td key={s.month} className="px-4 py-3 text-right font-semibold text-slate-900">
                      {fmtInt(s.clients)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LeadTrendChart title="Leads по месяцам" data={buildYearlyData((s) => s.totalLeads)} years={years} />
            <LeadTrendChart
              title="Qualified leads по месяцам"
              data={buildYearlyData((s) => s.totalQualifiedLeads)}
              years={years}
            />
          </div>
        </>
      )}
    </div>
  );
}
