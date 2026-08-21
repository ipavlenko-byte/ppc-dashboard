import { CampaignSummary } from "@/lib/metrics";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";

export function CampaignsTable({
  rows,
  total,
}: {
  rows: CampaignSummary[];
  total: CampaignSummary;
}) {
  const cols: { key: keyof CampaignSummary; label: string; fmt: (v: number) => string }[] = [
    { key: "impressions", label: "Показы", fmt: fmtInt },
    { key: "clicks", label: "Клики", fmt: fmtInt },
    { key: "ctr", label: "CTR", fmt: fmtPct },
    { key: "conversions", label: "Заявки", fmt: fmtInt },
    { key: "qualifiedLeads", label: "Кач. заявки", fmt: fmtInt },
    { key: "cpc", label: "CPC", fmt: fmtMoney },
    { key: "cpl", label: "CPL", fmt: fmtMoney },
    { key: "cpql", label: "CPQL", fmt: fmtMoney },
    { key: "cost", label: "Затраты", fmt: fmtMoney },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <th className="px-4 py-3">Кампания</th>
            {cols.map((c) => (
              <th key={c.key} className="px-4 py-3 text-right">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.campaign} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2.5 font-medium text-slate-800">{r.campaign}</td>
              {cols.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-right text-slate-700">
                  {c.fmt(r[c.key] as number)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-emerald-50 font-semibold text-slate-900">
            <td className="px-4 py-3">SUMMARY</td>
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-3 text-right">
                {c.fmt(total[c.key] as number)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
