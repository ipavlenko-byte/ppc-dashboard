import {
  AdsDailyRow,
  Ga4DailyRow,
  QualifiedLeadsRow,
  JoinedRow,
  AdMetricsBase,
  AdGroupDailyRow,
} from "./types";
import { ResolvedDateFilter } from "./dateFilter";

function normKey(date: string, campaign: string) {
  return `${date}__${campaign.trim().toLowerCase()}`;
}

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export interface MonthToDateInfo {
  monthStart: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD, самая свежая дата в данных
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
}

// "Сегодня" берём как самую свежую дату в самих данных, а не Date.now() —
// синк идёт с задержкой в 1-3 дня, и системные часы сервера не должны решать,
// сколько дней месяца уже "прошло" для целей пейсинга.
export function getMonthToDateInfo<T extends { date: string }>(rows: T[]): MonthToDateInfo | null {
  if (rows.length === 0) return null;
  const today = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);
  const [year, month] = today.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = Number(today.split("-")[2]);
  return { monthStart, today, daysInMonth, daysElapsed, daysRemaining: daysInMonth - daysElapsed };
}

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
      searchImpressionShare: row.searchImpressionShare,
      searchBudgetLostIS: row.searchBudgetLostIS,
      searchRankLostIS: row.searchRankLostIS,
      dailyBudget: row.dailyBudget,
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
  bounceRate: number | null;
  pagesPerSession: number | null;
  avgSessionDurationSec: number | null;
  searchImpressionShare: number | null;
  searchBudgetLostIS: number | null;
  searchRankLostIS: number | null;
  dailyBudget: number | null;
}

interface CampaignAccumulator extends CampaignSummary {
  ga4Weight: number;
  bounceRateWeighted: number;
  pagesPerSessionWeighted: number;
  avgSessionDurationWeighted: number;
  latestDate: string;
}

function emptyAccumulator(campaign: string): CampaignAccumulator {
  return {
    campaign,
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
    bounceRate: null,
    pagesPerSession: null,
    avgSessionDurationSec: null,
    searchImpressionShare: null,
    searchBudgetLostIS: null,
    searchRankLostIS: null,
    dailyBudget: null,
    ga4Weight: 0,
    bounceRateWeighted: 0,
    pagesPerSessionWeighted: 0,
    avgSessionDurationWeighted: 0,
    latestDate: "",
  };
}

function finalizeCampaignSummary(c: CampaignAccumulator): CampaignSummary {
  return {
    campaign: c.campaign,
    impressions: c.impressions,
    clicks: c.clicks,
    cost: c.cost,
    conversions: c.conversions,
    qualifiedLeads: c.qualifiedLeads,
    ctr: safeDiv(c.clicks, c.impressions),
    cpc: safeDiv(c.cost, c.clicks),
    cr: safeDiv(c.conversions, c.clicks),
    cpl: safeDiv(c.cost, c.conversions),
    cpql: safeDiv(c.cost, c.qualifiedLeads),
    bounceRate: c.ga4Weight > 0 ? c.bounceRateWeighted / c.ga4Weight : null,
    pagesPerSession: c.ga4Weight > 0 ? c.pagesPerSessionWeighted / c.ga4Weight : null,
    avgSessionDurationSec: c.ga4Weight > 0 ? c.avgSessionDurationWeighted / c.ga4Weight : null,
    searchImpressionShare: c.searchImpressionShare,
    searchBudgetLostIS: c.searchBudgetLostIS,
    searchRankLostIS: c.searchRankLostIS,
    dailyBudget: c.dailyBudget,
  };
}

// Impression Share и дневной бюджет — не накопительные метрики, а снимок состояния
// кампании. Берём значение с самой свежей даты в выбранном периоде, а не сумму/среднее.
function applyLatestSnapshot(acc: CampaignAccumulator, r: JoinedRow) {
  if (r.date >= acc.latestDate) {
    acc.latestDate = r.date;
    acc.searchImpressionShare = r.searchImpressionShare;
    acc.searchBudgetLostIS = r.searchBudgetLostIS;
    acc.searchRankLostIS = r.searchRankLostIS;
    acc.dailyBudget = r.dailyBudget;
  }
}

export function summarizeByCampaign(rows: JoinedRow[]): CampaignSummary[] {
  const map = new Map<string, CampaignAccumulator>();
  for (const r of rows) {
    const existing = map.get(r.campaign) ?? emptyAccumulator(r.campaign);
    existing.impressions += r.impressions;
    existing.clicks += r.clicks;
    existing.cost += r.cost;
    existing.conversions += r.conversions;
    existing.qualifiedLeads += r.qualifiedLeads;
    // Взвешиваем GA4-метрики по кликам того дня, чтобы дни с большим трафиком
    // влияли на средний показатель сильнее, чем дни почти без кликов.
    if (r.bounceRate !== null && r.clicks > 0) {
      existing.ga4Weight += r.clicks;
      existing.bounceRateWeighted += r.bounceRate * r.clicks;
      existing.pagesPerSessionWeighted += (r.pagesPerSession ?? 0) * r.clicks;
      existing.avgSessionDurationWeighted += (r.avgSessionDurationSec ?? 0) * r.clicks;
    }
    applyLatestSnapshot(existing, r);
    map.set(r.campaign, existing);
  }
  return Array.from(map.values())
    .map(finalizeCampaignSummary)
    .sort((a, b) => b.cost - a.cost);
}

export function grandTotal(rows: JoinedRow[]): CampaignSummary {
  const acc = rows.reduce((a, r) => {
    a.impressions += r.impressions;
    a.clicks += r.clicks;
    a.cost += r.cost;
    a.conversions += r.conversions;
    a.qualifiedLeads += r.qualifiedLeads;
    if (r.bounceRate !== null && r.clicks > 0) {
      a.ga4Weight += r.clicks;
      a.bounceRateWeighted += r.bounceRate * r.clicks;
      a.pagesPerSessionWeighted += (r.pagesPerSession ?? 0) * r.clicks;
      a.avgSessionDurationWeighted += (r.avgSessionDurationSec ?? 0) * r.clicks;
    }
    return a;
  }, emptyAccumulator("TOTAL"));
  return finalizeCampaignSummary(acc);
}

export function filterByDays<T extends { date: string }>(rows: T[], days: number): T[] {
  if (rows.length === 0) return rows;
  const maxDate = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);
  const cutoff = new Date(maxDate);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return rows.filter((r) => r.date >= cutoffStr);
}

export function filterByRange<T extends { date: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

export interface PeriodBounds {
  from: string;
  to: string;
}

export function getPeriodBounds<T extends { date: string }>(
  rows: T[],
  filter: ResolvedDateFilter
): PeriodBounds | null {
  if (filter.mode === "range" && filter.from && filter.to) {
    return { from: filter.from, to: filter.to };
  }
  if (rows.length === 0) return null;
  const maxDate = rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date);
  const cutoff = new Date(maxDate);
  cutoff.setDate(cutoff.getDate() - (filter.days - 1));
  return { from: cutoff.toISOString().slice(0, 10), to: maxDate };
}

export function getPreviousPeriodBounds(current: PeriodBounds): PeriodBounds {
  const fromD = new Date(current.from);
  const toD = new Date(current.to);
  const lengthDays = Math.round((toD.getTime() - fromD.getTime()) / 86_400_000) + 1;

  const prevTo = new Date(fromD);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (lengthDays - 1));

  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}

export function applyDateFilter<T extends { date: string }>(rows: T[], filter: ResolvedDateFilter): T[] {
  return filter.mode === "range" && filter.from && filter.to
    ? filterByRange(rows, filter.from, filter.to)
    : filterByDays(rows, filter.days);
}

export interface AdSummary {
  name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cr: number;
  cpl: number;
  bounceRate: number | null;
  pagesPerSession: number | null;
  avgSessionDurationSec: number | null;
}

function emptyAdSummary(name: string): AdSummary {
  return {
    name,
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    cr: 0,
    cpl: 0,
    bounceRate: null,
    pagesPerSession: null,
    avgSessionDurationSec: null,
  };
}

export function summarizeGeneric<T extends AdMetricsBase>(
  rows: T[],
  keyFn: (r: T) => string
): AdSummary[] {
  const map = new Map<string, AdSummary>();
  for (const r of rows) {
    const key = keyFn(r);
    const existing = map.get(key) ?? emptyAdSummary(key);
    existing.impressions += r.impressions;
    existing.clicks += r.clicks;
    existing.cost += r.cost;
    existing.conversions += r.conversions;
    map.set(key, existing);
  }
  return Array.from(map.values())
    .map((c) => ({
      ...c,
      ctr: safeDiv(c.clicks, c.impressions),
      cpc: safeDiv(c.cost, c.clicks),
      cr: safeDiv(c.conversions, c.clicks),
      cpl: safeDiv(c.cost, c.conversions),
    }))
    .sort((a, b) => b.cost - a.cost);
}

export function grandTotalGeneric(summaries: AdSummary[]): AdSummary {
  let ga4Weight = 0;
  let bounceRateWeighted = 0;
  let pagesPerSessionWeighted = 0;
  let avgSessionDurationWeighted = 0;

  const total = summaries.reduce((acc, c) => {
    acc.impressions += c.impressions;
    acc.clicks += c.clicks;
    acc.cost += c.cost;
    acc.conversions += c.conversions;
    if (c.bounceRate !== null && c.clicks > 0) {
      ga4Weight += c.clicks;
      bounceRateWeighted += c.bounceRate * c.clicks;
      pagesPerSessionWeighted += (c.pagesPerSession ?? 0) * c.clicks;
      avgSessionDurationWeighted += (c.avgSessionDurationSec ?? 0) * c.clicks;
    }
    return acc;
  }, emptyAdSummary("SUMMARY"));
  total.ctr = safeDiv(total.clicks, total.impressions);
  total.cpc = safeDiv(total.cost, total.clicks);
  total.cr = safeDiv(total.conversions, total.clicks);
  total.cpl = safeDiv(total.cost, total.conversions);
  total.bounceRate = ga4Weight > 0 ? bounceRateWeighted / ga4Weight : null;
  total.pagesPerSession = ga4Weight > 0 ? pagesPerSessionWeighted / ga4Weight : null;
  total.avgSessionDurationSec = ga4Weight > 0 ? avgSessionDurationWeighted / ga4Weight : null;
  return total;
}

interface Ga4Metrics {
  date: string;
  campaign: string;
  adGroup: string;
  bounceRate: number;
  pagesPerSession: number;
  avgSessionDurationSec: number;
}

export function summarizeAdGroupsWithGa4(
  adGroupRows: AdGroupDailyRow[],
  ga4Rows: Ga4Metrics[]
): AdSummary[] {
  const ga4Map = new Map(
    ga4Rows.map((r) => [`${r.date}__${r.campaign}__${r.adGroup}`, r])
  );

  interface Acc extends AdSummary {
    ga4Weight: number;
    bounceRateWeighted: number;
    pagesPerSessionWeighted: number;
    avgSessionDurationWeighted: number;
  }

  const map = new Map<string, Acc>();
  for (const r of adGroupRows) {
    const key = r.adGroup;
    const existing =
      map.get(key) ??
      ({ ...emptyAdSummary(key), ga4Weight: 0, bounceRateWeighted: 0, pagesPerSessionWeighted: 0, avgSessionDurationWeighted: 0 } as Acc);
    existing.impressions += r.impressions;
    existing.clicks += r.clicks;
    existing.cost += r.cost;
    existing.conversions += r.conversions;

    const ga4Row = ga4Map.get(`${r.date}__${r.campaign}__${r.adGroup}`);
    if (ga4Row && r.clicks > 0) {
      existing.ga4Weight += r.clicks;
      existing.bounceRateWeighted += ga4Row.bounceRate * r.clicks;
      existing.pagesPerSessionWeighted += ga4Row.pagesPerSession * r.clicks;
      existing.avgSessionDurationWeighted += ga4Row.avgSessionDurationSec * r.clicks;
    }
    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((c) => ({
      name: c.name,
      impressions: c.impressions,
      clicks: c.clicks,
      cost: c.cost,
      conversions: c.conversions,
      ctr: safeDiv(c.clicks, c.impressions),
      cpc: safeDiv(c.cost, c.clicks),
      cr: safeDiv(c.conversions, c.clicks),
      cpl: safeDiv(c.cost, c.conversions),
      bounceRate: c.ga4Weight > 0 ? c.bounceRateWeighted / c.ga4Weight : null,
      pagesPerSession: c.ga4Weight > 0 ? c.pagesPerSessionWeighted / c.ga4Weight : null,
      avgSessionDurationSec: c.ga4Weight > 0 ? c.avgSessionDurationWeighted / c.ga4Weight : null,
    }))
    .sort((a, b) => b.cost - a.cost);
}

interface SeoMetricsBase {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface SeoSummary {
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// position — средневзвешенная по impressions, а не среднее из средних:
// день с 10 показами не должен весить как день с 10 000.
export function summarizeSeo<T extends SeoMetricsBase>(rows: T[], keyFn: (r: T) => string): SeoSummary[] {
  interface Acc extends SeoSummary {
    positionWeighted: number;
  }
  const map = new Map<string, Acc>();
  for (const r of rows) {
    const key = keyFn(r);
    const existing = map.get(key) ?? { name: key, clicks: 0, impressions: 0, ctr: 0, position: 0, positionWeighted: 0 };
    existing.clicks += r.clicks;
    existing.impressions += r.impressions;
    existing.positionWeighted += r.position * r.impressions;
    map.set(key, existing);
  }
  return Array.from(map.values())
    .map((c) => ({
      name: c.name,
      clicks: c.clicks,
      impressions: c.impressions,
      ctr: safeDiv(c.clicks, c.impressions),
      position: c.impressions > 0 ? c.positionWeighted / c.impressions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export function grandTotalSeo(summaries: SeoSummary[]): SeoSummary {
  let positionWeighted = 0;
  const total = summaries.reduce(
    (acc, c) => {
      acc.clicks += c.clicks;
      acc.impressions += c.impressions;
      positionWeighted += c.position * c.impressions;
      return acc;
    },
    { name: "SUMMARY", clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );
  total.ctr = safeDiv(total.clicks, total.impressions);
  total.position = total.impressions > 0 ? positionWeighted / total.impressions : 0;
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
