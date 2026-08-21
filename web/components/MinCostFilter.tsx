"use client";

import { useState } from "react";

export function MinCostFilter({ currentMinCost }: { currentMinCost: number }) {
  const [value, setValue] = useState(String(currentMinCost));

  const apply = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("minCost", value || "0");
    window.location.href = url.toString();
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border-2 border-slate-300 bg-white p-1 shadow-sm">
      <span className="pl-2 text-sm text-slate-500">HK$ ≥</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        className="w-20 rounded-md px-2 py-1 text-sm text-slate-700 outline-none"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        Применить
      </button>
    </div>
  );
}
