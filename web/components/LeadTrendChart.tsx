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

const LINE_COLORS = ["#94a3b8", "#f59e0b", "#2563eb", "#059669", "#dc2626", "#7c3aed"];

// data: { monthLabel: "Jan", "2024": 12, "2025": 17, ... } — одна строка на месяц года,
// одна линия на год. metric — какое поле рисуем (передаём title для заголовка/оси).
export function LeadTrendChart({
  title,
  data,
  years,
}: {
  title: string;
  data: Record<string, number | string>[];
  years: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={year}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
