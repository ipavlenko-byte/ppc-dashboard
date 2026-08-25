import { SeoSummary } from "@/lib/metrics";
import { fmtInt, fmtPct, fmtDecimal } from "@/lib/format";
import { ExportCsvButton } from "./ExportCsvButton";

export function SeoTable({
  rows,
  total,
  nameLabel,
}: {
  rows: SeoSummary[];
  total: SeoSummary;
  nameLabel: string;
}) {
  const cols: { key: keyof SeoSummary; label: string; fmt: (v: number) => string }[] = [
    { key: "impressions", label: "Показы", fmt: fmtInt },
    { key: "clicks", label: "Клики", fmt: fmtInt },
    { key: "ctr", label: "CTR", fmt: fmtPct },
    { key: "position", label: "Средняя позиция", fmt: fmtDecimal },
  ];

  const csvRows = [...rows, ...(rows.length > 0 ? [total] : [])].map((r) => [
    r.name,
    ...cols.map((c) => r[c.key] as number),
  ]);

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div className="flex justify-end">
          <ExportCsvButton
            filename={nameLabel}
            headers={[nameLabel, ...cols.map((c) => c.label)]}
            rows={csvRows}
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
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
                <td className="max-w-xs truncate px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-right text-slate-700">
                    {c.fmt(r[c.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-emerald-50 font-semibold text-slate-900">
                <td className="px-4 py-3">SUMMARY</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-right">
                    {c.fmt(total[c.key] as number)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
