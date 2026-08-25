"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Point {
  date: string;
  clicks: number;
  impressions: number;
}

export function SeoTrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis yAxisId="clicks" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="impressions" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="clicks"
            type="monotone"
            dataKey="clicks"
            name="Клики"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="impressions"
            type="monotone"
            dataKey="impressions"
            name="Показы"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
