import Link from "next/link";
import { AdSummary } from "@/lib/metrics";
import { fmtInt, fmtMoney, fmtPct, fmtDecimal, fmtDuration, fmtOrDash } from "@/lib/format";

export function MetricsTable({
  rows,
  total,
  nameLabel,
  linkFor,
}: {
  rows: AdSummary[];
  total: AdSummary;
  nameLabel: string;
  linkFor?: (name: string) => string;
}) {
  const hasGa4 = rows.some((r) => r.bounceRate !== null);

  const cols: { key: keyof AdSummary; label: string; fmt: (v: number | null) => string }[] = [
    { key: "impressions", label: "Показы", fmt: (v) => fmtInt(v as number) },
    { key: "clicks", label: "Клики", fmt: (v) => fmtInt(v as number) },
    { key: "ctr", label: "CTR", fmt: (v) => fmtPct(v as number) },
    ...(hasGa4
      ? [
          {
            key: "bounceRate" as const,
            label: "Процент отказов",
            fmt: (v: number | null) => fmtOrDash(v, fmtPct),
          },
          {
            key: "pagesPerSession" as const,
            label: "Глубина просмотра",
            fmt: (v: number | null) => fmtOrDash(v, fmtDecimal),
          },
          {
            key: "avgSessionDurationSec" as const,
            label: "Время на сайте",
            fmt: (v: number | null) => fmtOrDash(v, fmtDuration),
          },
        ]
      : []),
    { key: "conversions", label: "Заявки", fmt: (v) => fmtInt(v as number) },
    { key: "cpc", label: "CPC", fmt: (v) => fmtMoney(v as number) },
    { key: "cpl", label: "CPL", fmt: (v) => fmtMoney(v as number) },
    { key: "cost", label: "Затраты", fmt: (v) => fmtMoney(v as number) },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <th className="px-4 py-3">{nameLabel}</th>
            {cols.map((c) => (
              <th key={c.key} className="px-4 py-3 text-right">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} className="px-4 py-6 text-center text-slate-400">
                Нет данных за выбранный период
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2.5 font-medium text-slate-800">
                {linkFor ? (
                  <Link href={linkFor(r.name)} className="text-blue-600 hover:underline">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </td>
              {cols.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-right text-slate-700">
                  {c.fmt(r[c.key] as number | null)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="bg-emerald-50 font-semibold text-slate-900">
              <td className="px-4 py-3">SUMMARY</td>
              {cols.map((c) => (
                <td key={c.key} className="px-4 py-3 text-right">
                  {c.fmt(total[c.key] as number | null)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
