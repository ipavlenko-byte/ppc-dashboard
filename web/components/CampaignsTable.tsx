import Link from "next/link";
import clsx from "clsx";
import { CampaignSummary } from "@/lib/metrics";
import { AnomalyFlag } from "@/lib/anomalies";
import { CampaignTrend, TrendLevel } from "@/lib/trends";
import { fmtInt, fmtMoneyDual, fmtPct, fmtDecimal, fmtDuration, fmtOrDash } from "@/lib/format";
import { ExportCsvButton } from "./ExportCsvButton";

function TrendArrow({ level }: { level: TrendLevel }) {
  if (level === "neutral") return null;
  return (
    <span
      className={clsx("ml-1 text-xs", level === "good" ? "text-emerald-600" : "text-red-600")}
      title={level === "good" ? "Лучше, чем в прошлом периоде" : "Хуже, чем в прошлом периоде"}
    >
      {level === "good" ? "▲" : "▼"}
    </span>
  );
}

export function CampaignsTable({
  rows,
  total,
  linkFor,
  flagFor,
  trendFor,
}: {
  rows: CampaignSummary[];
  total: CampaignSummary;
  linkFor?: (campaign: string) => string;
  flagFor?: (campaign: CampaignSummary) => AnomalyFlag;
  trendFor?: (campaign: CampaignSummary) => CampaignTrend | null;
}) {
  const cols: {
    key: keyof CampaignSummary;
    label: string;
    fmt: (v: number | null) => string;
    trendKey?: keyof CampaignTrend;
  }[] = [
    { key: "impressions", label: "Показы", fmt: (v) => fmtInt(v as number) },
    { key: "clicks", label: "Клики", fmt: (v) => fmtInt(v as number) },
    { key: "ctr", label: "CTR", fmt: (v) => fmtPct(v as number), trendKey: "ctr" },
    { key: "searchImpressionShare", label: "IS (Search)", fmt: (v) => fmtOrDash(v, fmtPct) },
    { key: "dailyBudget", label: "Дневной бюджет", fmt: (v) => fmtOrDash(v, fmtMoneyDual) },
    { key: "bounceRate", label: "Процент отказов", fmt: (v) => fmtOrDash(v, fmtPct) },
    { key: "pagesPerSession", label: "Глубина просмотра", fmt: (v) => fmtOrDash(v, fmtDecimal) },
    { key: "avgSessionDurationSec", label: "Время на сайте", fmt: (v) => fmtOrDash(v, fmtDuration) },
    { key: "conversions", label: "Заявки", fmt: (v) => fmtInt(v as number) },
    { key: "qualifiedLeads", label: "Кач. заявки", fmt: (v) => fmtInt(v as number) },
    { key: "cpc", label: "CPC", fmt: (v) => fmtMoneyDual(v as number), trendKey: "cpc" },
    { key: "cpl", label: "CPL", fmt: (v) => fmtMoneyDual(v as number) },
    { key: "cpql", label: "CPQL", fmt: (v) => fmtMoneyDual(v as number) },
    { key: "cost", label: "Затраты", fmt: (v) => fmtMoneyDual(v as number) },
  ];

  const csvRows = [...rows, total].map((r) => [
    r.campaign,
    ...cols.map((c) => {
      const v = r[c.key];
      return v === null ? "" : (v as number);
    }),
  ]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <ExportCsvButton
          filename="campaigns"
          headers={["Кампания", ...cols.map((c) => c.label)]}
          rows={csvRows}
        />
      </div>
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
            const trend = trendFor?.(r);
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
                    {c.trendKey && trend && <TrendArrow level={trend[c.trendKey]} />}
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
    </div>
  );
}
