import { FunnelMonthlyRow, FunnelLeadsMonthlyRow } from "./types";

export interface FunnelMonthSummary {
  month: string;
  users: number;
  totalLeads: number;
  cr1: number | null; // leads / users * 100
  totalQualifiedLeads: number;
  cr2: number | null; // qualifiedLeads / leads * 100
  clients: number;
  cr3: number | null; // clients / qualifiedLeads * 100
  bySource: { source: string; leads: number; qualifiedLeads: number }[];
}

const safePct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

// Тот же расчёт, что раньше жил формулами в Google Sheets (CR1=leads/users,
// CR2=qualifiedLeads/leads, CR3=clients/qualifiedLeads) — просто в TS, чтобы
// в ручную воронку вводились только сырые числа, а не проценты.
export function summarizeFunnelByMonth(
  funnelRows: FunnelMonthlyRow[],
  leadsRows: FunnelLeadsMonthlyRow[]
): FunnelMonthSummary[] {
  const leadsByMonth = new Map<string, FunnelLeadsMonthlyRow[]>();
  for (const r of leadsRows) {
    const list = leadsByMonth.get(r.month) ?? [];
    list.push(r);
    leadsByMonth.set(r.month, list);
  }

  return funnelRows
    .map((f) => {
      const bySource = leadsByMonth.get(f.month) ?? [];
      const totalLeads = bySource.reduce((s, r) => s + r.leads, 0);
      const totalQualifiedLeads = bySource.reduce((s, r) => s + r.qualifiedLeads, 0);
      return {
        month: f.month,
        users: f.users,
        totalLeads,
        cr1: safePct(totalLeads, f.users),
        totalQualifiedLeads,
        cr2: safePct(totalQualifiedLeads, totalLeads),
        clients: f.clients,
        cr3: safePct(f.clients, totalQualifiedLeads),
        bySource: bySource.map((r) => ({ source: r.source, leads: r.leads, qualifiedLeads: r.qualifiedLeads })),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}
