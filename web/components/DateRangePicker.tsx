import Link from "next/link";
import clsx from "clsx";

const PRESETS = [7, 14, 30] as const;

export function DateRangePicker({
  basePath,
  currentDays,
  extraParams,
}: {
  basePath: string;
  currentDays: number;
  extraParams?: Record<string, string>;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {PRESETS.map((days) => (
        <Link
          key={days}
          href={`${basePath}?${new URLSearchParams({ ...extraParams, days: String(days) }).toString()}`}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            days === currentDays
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {days} дней
        </Link>
      ))}
    </div>
  );
}

export function parseDays(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return PRESETS.includes(n as (typeof PRESETS)[number]) ? n : 30;
}
