import { AdsDailyRow, Ga4DailyRow, QualifiedLeadsRow } from "./types";

const CAMPAIGNS = [
  { name: "Sellvia_Pmax_US_CAN_UK_AUS_SG #2", baseCost: 3200, baseCtr: 0.059, baseCr: 0.266 },
  { name: "Sellvia_pmax_page_feed - video_US_CAN", baseCost: 1300, baseCtr: 0.048, baseCr: 0.244 },
  { name: "Sellvia_DP_US_UK_CAN_AUS_SG", baseCost: 930, baseCtr: 0.039, baseCr: 0.203 },
  { name: "Sellvia_Search_All_US", baseCost: 750, baseCtr: 0.086, baseCr: 0.308 },
  { name: "Sellvia_DG_US_UK_AU_CAN_2", baseCost: 460, baseCtr: 0.005, baseCr: 0.134 },
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function generateMockAds(days = 30): AdsDailyRow[] {
  const rows: AdsDailyRow[] = [];
  const rand = seedRandom(42);
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = toISODate(d);
    for (const c of CAMPAIGNS) {
      const jitter = 0.8 + rand() * 0.4;
      const cost = Math.round(c.baseCost * jitter);
      const impressions = Math.round((cost / (c.baseCtr * 2.5)) * jitter);
      const clicks = Math.round(impressions * c.baseCtr * (0.9 + rand() * 0.2));
      const conversions = Math.round(clicks * c.baseCr * (0.85 + rand() * 0.3));
      rows.push({ date, campaign: c.name, impressions, clicks, cost, conversions });
    }
  }
  return rows;
}

export function generateMockGa4(ads: AdsDailyRow[]): Ga4DailyRow[] {
  const rand = seedRandom(7);
  return ads.map((r) => ({
    date: r.date,
    campaign: r.campaign,
    bounceRate: Math.round((0.2 + rand() * 0.3) * 100) / 100,
    pagesPerSession: Math.round((1.2 + rand() * 1.2) * 100) / 100,
    avgSessionDurationSec: Math.round(40 + rand() * 140),
  }));
}

export function generateMockQualifiedLeads(ads: AdsDailyRow[]): QualifiedLeadsRow[] {
  const rand = seedRandom(99);
  return ads.map((r) => ({
    date: r.date,
    campaign: r.campaign,
    qualifiedLeads: Math.round(r.conversions * (0.25 + rand() * 0.45)),
  }));
}
