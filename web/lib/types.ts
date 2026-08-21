export interface AdsDailyRow {
  date: string; // YYYY-MM-DD
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number; // leads (заявки)
}

export interface Ga4DailyRow {
  date: string;
  campaign: string;
  bounceRate: number; // 0-1
  pagesPerSession: number;
  avgSessionDurationSec: number;
}

export interface QualifiedLeadsRow {
  date: string;
  campaign: string;
  qualifiedLeads: number;
}

export interface JoinedRow {
  date: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  qualifiedLeads: number;
  bounceRate: number | null;
  pagesPerSession: number | null;
  avgSessionDurationSec: number | null;
  ctr: number;
  cpc: number;
  cr: number; // conversions / clicks
  cpl: number; // cost / conversions
  cpql: number; // cost / qualifiedLeads
}
