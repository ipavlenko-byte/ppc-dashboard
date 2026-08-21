import { AdsDailyRow, Ga4DailyRow, QualifiedLeadsRow, JoinedRow } from "./types";

function normKey(date: string, campaign: string) {
  return `${date}__${campaign.trim().toLowerCase()}`;
}

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function joinRows(
  ads: AdsDailyRow[],
  ga4: Ga4DailyRow[],
  leads: QualifiedLeadsRow[]
): JoinedRow[] {
  const ga4Map = new Map(ga4.map((r) => [normKey(r.date, r.campaign), r]));
  const leadsMap = new Map(leads.map((r) => [normKey(r.date, r.campaign), r]));

  return ads.map((row) => {
    const ga4Row = ga4Map.get(normKey(row.date, row.campaign));
    const leadsRow = leadsMap.get(normKey(row.date, row.campaign));
    const qualifiedLeads = leadsRow?.qualifiedLeads ?? 0;

    return {
      date: row.date,
      campaign: row.campaign,
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      qualifiedLeads,
      bounceRate: ga4Row?.bounceRate ?? null,
      pagesPerSession: ga4Row?.pagesPerSession ?? null,
      avgSessionDurationSec: ga4Row?.avgSessionDurationSec ?? null,
      ctr: safeDiv(row.clicks, row.impressions),
      cpc: safeDiv(row.cost, row.clicks),
      cr: safeDiv(row.conversions, row.clicks),
      cpl: safeDiv(row.cost, row.conversions),
      cpql: safeDiv(row.cost, qualifiedLeads),
    };
  });
}

export interface CampaignSummary {
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  qualifiedLeads: number;
  ctr: number;
  cpc: number;
  cr: number;
  cpl: number;
  cpql: number;
}

export function summarizeByCampaign(rows: JoinedRow[]): CampaignSummary[] {
  const map = new Map<string, CampaignSummary>();
  for (const r of rows) {
    const existing = map.get(r.campaign) ?? {
      campaign: r.campaign,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      qualifiedLeads: 0,
      ctr: 0,
      cpc: 0,
      cr: 0,
      cpl: 0,
      cpql: 0,
    };
    existing.impressions += r.impressions;
    existing.clicks += r.clicks;
    existing.cost += r.cost;
    existing.conversions += r.conversions;
    existing.qualifiedLeads += r.qualifiedLeads;
    map.set(r.campaign, existing);
  }
  return Array.from(map.values())
    .map((c) => ({
      ...c,
      ctr: safeDiv(c.clicks, c.impressions),
      cpc: safeDiv(c.cost, c.clicks),
      cr: safeDiv(c.conversions, c.clicks),
      cpl: safeDiv(c.cost, c.conversions),
      cpql: safeDiv(c.cost, c.qualifiedLeads),
    }))
    .sort((a, b) => b.cost - a.cost);
}

export function grandTotal(rows: JoinedRow[]): CampaignSummary {
  const summaries = summarizeByCampaign(rows);
  const total = summaries.reduce(
    (acc, c) => ({
      campaign: "TOTAL",
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      cost: acc.cost + c.cost,
      conversions: acc.conversions + c.conversions,
      qualifiedLeads: acc.qualifiedLeads + c.qualifiedLeads,
      ctr: 0,
      cpc: 0,
      cr: 0,
      cpl: 0,
      cpql: 0,
    }),
    {
      campaign: "TOTAL",
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      qualifiedLeads: 0,
      ctr: 0,
      cpc: 0,
      cr: 0,
      cpl: 0,
      cpql: 0,
    }
  );
  total.ctr = safeDiv(total.clicks, total.impressions);
  total.cpc = safeDiv(total.cost, total.clicks);
  total.cr = safeDiv(total.conversions, total.clicks);
  total.cpl = safeDiv(total.cost, total.conversions);
  total.cpql = safeDiv(total.cost, total.qualifiedLeads);
  return total;
}

export function dailyTrend(rows: JoinedRow[]) {
  const map = new Map<
    string,
    { date: string; cost: number; conversions: number; qualifiedLeads: number; clicks: number }
  >();
  for (const r of rows) {
    const existing = map.get(r.date) ?? {
      date: r.date,
      cost: 0,
      conversions: 0,
      qualifiedLeads: 0,
      clicks: 0,
    };
    existing.cost += r.cost;
    existing.conversions += r.conversions;
    existing.qualifiedLeads += r.qualifiedLeads;
    existing.clicks += r.clicks;
    map.set(r.date, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
