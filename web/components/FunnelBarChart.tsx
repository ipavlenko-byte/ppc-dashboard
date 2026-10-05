"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";

export interface FunnelBarPoint {
  month: string;
  leads: number;
  qualified: number;
  clients: number;
}

// Три столбца на месяц: Заявки → Quality leads → Клиенты (данные заполняются вручную).
export function FunnelBarChart({ data }: { data: FunnelBarPoint[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-600">Заявки → Qualified → Клиенты по месяцам</h3>
      <div className="h-80 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="leads" name="Заявки" fill="#94a3b8" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="leads" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
            </Bar>
            <Bar dataKey="qualified" name="Qualified" fill="#2563eb" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="qualified" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
            </Bar>
            <Bar dataKey="clients" name="Клиенты" fill="#059669" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="clients" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
