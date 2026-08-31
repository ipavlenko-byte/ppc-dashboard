"use client";

export function MonthPicker({ months, current, basePath }: { months: string[]; current: string; basePath: string }) {
  return (
    <select
      value={current}
      onChange={(e) => {
        // Полная перезагрузка вместо клиентской навигации — обходит кэш роутов
        // Next.js (см. CampaignFilter.tsx).
        window.location.href = `${basePath}?month=${e.target.value}`;
      }}
      className="min-w-[160px] rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-400 focus:border-blue-500"
    >
      {months.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
