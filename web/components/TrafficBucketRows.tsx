"use client";

import { useState } from "react";
import { fmtInt } from "@/lib/format";

const DOT_COLORS: Record<string, string> = {
  Direct: "bg-slate-500",
  "Search: Google": "bg-blue-500",
  "Search: Other": "bg-sky-400",
  "Ads: Google": "bg-amber-500",
  "Ads: Other": "bg-orange-400",
  Websites: "bg-teal-500",
  AI: "bg-violet-500",
  "Social Networks": "bg-pink-500",
  Bots: "bg-red-400",
  Other: "bg-slate-300",
};

const FIRST_COL_BODY = "sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-800";

export interface TrafficSourceLine {
  source: string;
  values: number[]; // по одному значению на месяц, в порядке months
}

// Строка канала; если есть разбивка по источникам — по клику раскрывается (по умолчанию закрыта).
// Маркер "лучше/хуже среднего": разница меньше порога считается шумом и не показывается.
export function AvgMarker({
  value,
  avg,
  higherIsBetter = true,
}: {
  value: number;
  avg: number;
  higherIsBetter?: boolean;
}) {
  if (!(avg > 0)) return null;
  const pct = ((value - avg) / avg) * 100;
  if (Math.abs(pct) < 10) return null;
  const good = higherIsBetter ? pct > 0 : pct < 0;
  return (
    <span
      title={`${pct > 0 ? "+" : ""}${Math.round(pct)}% к среднему`}
      className={`mr-1.5 text-[10px] font-semibold ${good ? "text-emerald-600" : "text-red-500"}`}
    >
      {pct > 0 ? "▲" : "▼"}
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

const avgOf = (values: number[], count: number) =>
  count > 0 ? values.slice(0, count).reduce((a, b) => a + b, 0) / count : 0;

const AVG_CELL = "bg-amber-50 px-4 text-right font-semibold text-amber-900";

export function TrafficBucketRows({
  bucket,
  values,
  sources,
  avgCount,
}: {
  bucket: string;
  values: number[];
  sources: TrafficSourceLine[];
  avgCount: number; // сколько первых месяцев входит в среднее
}) {
  const [open, setOpen] = useState(false);
  const expandable = sources.length > 0;
  const higherIsBetter = bucket !== "Bots"; // для ботов рост — это плохо
  const avg = avgOf(values, avgCount);

  return (
    <>
      <tr
        className={`border-b border-slate-100 hover:bg-blue-50/60 ${expandable ? "cursor-pointer" : ""}`}
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
      >
        <td className={FIRST_COL_BODY}>
          {expandable && (
            <span className="mr-1.5 inline-block w-3 text-xs text-slate-400">{open ? "▾" : "▸"}</span>
          )}
          <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${DOT_COLORS[bucket] ?? "bg-slate-300"}`} />
          {bucket}
        </td>
        <td className={`${AVG_CELL} py-2.5`}>{fmtInt(Math.round(avgOf(values, avgCount)))}</td>
        {values.map((v, i) => (
          <td key={i} className="px-4 py-2.5 text-right font-medium text-slate-800">
            {i < avgCount && <AvgMarker value={v} avg={avg} higherIsBetter={higherIsBetter} />}
            {fmtInt(v)}
          </td>
        ))}
      </tr>
      {open &&
        sources.map((s) => (
          <tr key={s.source} className="border-b border-slate-50 bg-slate-50/40">
            <td className="sticky left-0 z-10 bg-slate-50 px-4 py-1.5 pl-10 text-slate-500">{s.source}</td>
            <td className={`${AVG_CELL} py-1.5 font-medium`}>{fmtInt(Math.round(avgOf(s.values, avgCount)))}</td>
            {s.values.map((v, i) => (
              <td key={i} className="px-4 py-1.5 text-right text-slate-500">
                {i < avgCount && <AvgMarker value={v} avg={avgOf(s.values, avgCount)} higherIsBetter={higherIsBetter} />}
                {fmtInt(v)}
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}
