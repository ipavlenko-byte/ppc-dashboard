import { CampaignsTable } from "@/components/CampaignsTable";
import { fmtInt, fmtMoney } from "@/lib/format";
import type { CampaignSummary } from "@/lib/metrics";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-1.5 ring-1 ring-slate-200">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

// Карточка одного периода (неделя/месяц): заголовок, бейдж, итоги и таблица кампаний.
export function PeriodCard({
  title,
  tag,
  note,
  current,
  summaries,
  total,
  emptyText,
}: {
  title: string;
  tag: string;
  note?: string; // например "неделя 40" или "данные неполные"
  current: boolean;
  summaries: CampaignSummary[];
  total: CampaignSummary;
  emptyText: string;
}) {
  const cpl = total.conversions > 0 ? total.cost / total.conversions : null;
  return (
    <section
      className={`overflow-hidden rounded-xl border shadow-sm ${current ? "border-blue-300" : "border-slate-200"}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
          current ? "bg-gradient-to-r from-blue-600/10 to-blue-50" : "bg-slate-50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              current ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
            }`}
          >
            {tag}
          </span>
          {note && <span className="text-xs text-slate-400">{note}</span>}
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
          <div className="p-6 text-center text-sm text-slate-400">{emptyText}</div>
        ) : (
          <CampaignsTable rows={summaries} total={total} />
        )}
      </div>
    </section>
  );
}
