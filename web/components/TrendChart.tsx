"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Point {
  date: string;
  cost: number;
}

export function TrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `HK$${v}`} />
          <Tooltip formatter={(v) => [`HK$${Number(v).toFixed(0)}`, "Cost"]} />
          <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
