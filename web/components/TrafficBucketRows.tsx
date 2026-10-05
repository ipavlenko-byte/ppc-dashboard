"use client";

import { useState } from "react";
import { fmtInt } from "@/lib/format";

const FIRST_COL_BODY = "sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-800";

export interface TrafficSourceLine {
  source: string;
  values: number[]; // по одному значению на месяц, в порядке months
}

// Строка канала; если есть разбивка по источникам — по клику раскрывается (по умолчанию закрыта).
export function TrafficBucketRows({
  bucket,
  values,
  sources,
}: {
  bucket: string;
  values: number[];
  sources: TrafficSourceLine[];
}) {
  const [open, setOpen] = useState(false);
  const expandable = sources.length > 0;

  return (
    <>
      <tr
        className={`border-b border-slate-100 hover:bg-slate-50 ${expandable ? "cursor-pointer" : ""}`}
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
      >
        <td className={FIRST_COL_BODY}>
          {expandable && (
            <span className="mr-1.5 inline-block w-3 text-xs text-slate-400">{open ? "▾" : "▸"}</span>
          )}
          {bucket}
        </td>
        {values.map((v, i) => (
          <td key={i} className="px-4 py-2.5 text-right text-slate-700">
            {fmtInt(v)}
          </td>
        ))}
      </tr>
      {open &&
        sources.map((s) => (
          <tr key={s.source} className="border-b border-slate-50">
            <td className="sticky left-0 z-10 bg-white px-4 py-1.5 pl-9 text-slate-500">{s.source}</td>
            {s.values.map((v, i) => (
              <td key={i} className="px-4 py-1.5 text-right text-slate-500">
                {fmtInt(v)}
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}
