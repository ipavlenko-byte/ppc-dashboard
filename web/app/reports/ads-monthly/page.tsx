import { getDashboardData } from "@/lib/dataSource";
import { summarizeByCampaign, grandTotal, filterByRange } from "@/lib/metrics";
import { PeriodCard } from "@/components/PeriodCard";

export const revalidate = 300;

const MONTHS_TO_SHOW = 4;
const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

interface MonthBounds {
  key: string; // YYYY-MM
  from: string;
  to: string;
  title: string;
  tag: string;
}

// Текущий (возможно неполный) месяц — первый, дальше в прошлое.
function lastMonths(n: number): MonthBounds[] {
  const today = new Date();
  const out: MonthBounds[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const lastDay = new Date(y, m, 0).getDate();
    out.push({
      key,
      from: `${key}-01`,
      to: `${key}-${String(lastDay).padStart(2, "0")}`,
      title: `${MONTHS_RU[m - 1]} ${y}`,
      tag: i === 0 ? "Текущий месяц" : i === 1 ? "Прошлый месяц" : `${i} мес. назад`,
    });
  }
  return out;
}

export default async function AdsMonthlyReportPage() {
  const { rows: allRows, source } = await getDashboardData();
  const months = lastMonths(MONTHS_TO_SHOW);
  const firstDate = allRows.reduce((min, r) => (min === "" || r.date < min ? r.date : min), "");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Google Ads помесячно</h1>
          <p className="mt-1 text-sm text-slate-500">
            Сравнение последних {MONTHS_TO_SHOW} месяцев, текущий — сверху.
          </p>
        </div>
        {source === "mock" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Демо-данные (Sheet не подключён)
          </span>
        )}
      </div>

      {months.map((m, i) => {
        const rows = filterByRange(allRows, m.from, m.to);
        const startsMidMonth = firstDate !== "" && m.key === firstDate.slice(0, 7) && firstDate.slice(8, 10) !== "01";
        const note = i === 0 ? "месяц ещё идёт" : startsMidMonth ? `данные с ${firstDate}` : undefined;
        return (
          <PeriodCard
            key={m.key}
            title={m.title}
            tag={m.tag}
            note={note}
            current={i === 0}
            summaries={summarizeByCampaign(rows)}
            total={grandTotal(rows)}
            emptyText="Нет данных за этот месяц"
          />
        );
      })}
    </div>
  );
}
