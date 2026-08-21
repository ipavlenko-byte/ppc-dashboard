"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PRESET_DAYS, ResolvedDateFilter } from "@/lib/dateFilter";

export function DateRangePicker({
  basePath,
  extraParams,
  current,
}: {
  basePath: string;
  extraParams?: Record<string, string>;
  current: ResolvedDateFilter;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");

  const goto = (params: Record<string, string>) => {
    const query = new URLSearchParams({ ...extraParams, ...params });
    router.push(`${basePath}?${query.toString()}`);
    router.refresh();
  };

  const applyRange = () => {
    if (from && to) goto({ from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {PRESET_DAYS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              goto({ days: String(days) });
            }}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              current.mode === "days" && current.days === days
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {days === 1 ? "1 день" : `${days} дней`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md px-2 py-1 text-sm text-slate-700 outline-none"
        />
        <span className="text-slate-300">–</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md px-2 py-1 text-sm text-slate-700 outline-none"
        />
        <button
          type="button"
          onClick={applyRange}
          disabled={!from || !to}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            current.mode === "range"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 disabled:text-slate-300"
          )}
        >
          Применить
        </button>
      </div>
    </div>
  );
}
