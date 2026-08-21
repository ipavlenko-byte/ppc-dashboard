import Link from "next/link";
import clsx from "clsx";
import { CampaignSummary } from "@/lib/metrics";
import { AnomalyFlag } from "@/lib/anomalies";
import { fmtInt, fmtMoney, fmtPct, fmtDecimal, fmtDuration, fmtOrDash } from "@/lib/format";

export function CampaignsTable({
  rows,
  total,
  linkFor,
  flagFor,
}: {
  rows: CampaignSummary[];
  total: CampaignSummary;
  linkFor?: (campaign: string) => string;
  flagFor?: (campaign: CampaignSummary) => AnomalyFlag;
}) {
  const cols: { key: keyof CampaignSummary; label: string; fmt: (v: number | null) => string }[] = [
    { key: "impressions", label: "Показы", fmt: (v) => fmtInt(v as number) },
    { key: "clicks", label: "Клики", fmt: (v) => fmtInt(v as number) },
    { key: "ctr", label: "CTR", fmt: (v) => fmtPct(v as number) },
    { key: "bounceRate", label: "Процент отказов", fmt: (v) => fmtOrDash(v, fmtPct) },
    { key: "pagesPerSession", label: "Глубина просмотра", fmt: (v) => fmtOrDash(v, fmtDecimal) },
    { key: "avgSessionDurationSec", label: "Время на сайте", fmt: (v) => fmtOrDash(v, fmtDuration) },
    { key: "conversions", label: "Заявки", fmt: (v) => fmtInt(v as number) },
    { key: "qualifiedLeads", label: "Кач. заявки", fmt: (v) => fmtInt(v as number) },
    { key: "cpc", label: "CPC", fmt: (v) => fmtMoney(v as number) },
    { key: "cpl", label: "CPL", fmt: (v) => fmtMoney(v as number) },
    { key: "cpql", label: "CPQL", fmt: (v) => fmtMoney(v as number) },
    { key: "cost", label: "Затраты", fmt: (v) => fmtMoney(v as number) },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1300px] text-sm">
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
          {rows.map((r) => {
            const flag = flagFor?.(r);
            return (
              <tr
                key={r.campaign}
                title={flag?.reasons.join(" · ")}
                className={clsx(
                  "border-b border-slate-100 hover:bg-slate-50",
                  flag?.level === "critical" && "bg-red-50 hover:bg-red-100",
                  flag?.level === "warning" && "bg-amber-50 hover:bg-amber-100"
                )}
              >
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  <span className="flex items-center gap-1.5">
                    {flag?.level === "critical" && <span aria-hidden>🔴</span>}
                    {flag?.level === "warning" && <span aria-hidden>🟡</span>}
                    {linkFor ? (
                      <Link href={linkFor(r.campaign)} className="text-blue-600 hover:underline">
                        {r.campaign}
                      </Link>
                    ) : (
                      r.campaign
                    )}
                  </span>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-right text-slate-700">
                    {c.fmt(r[c.key] as number | null)}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="bg-emerald-50 font-semibold text-slate-900">
            <td className="px-4 py-3">SUMMARY</td>
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-3 text-right">
                {c.fmt(total[c.key] as number | null)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
