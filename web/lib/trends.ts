import { CampaignSummary, SeoSummary } from "./metrics";

export type TrendLevel = "good" | "bad" | "neutral";

export interface CampaignTrend {
  ctr: TrendLevel;
  cpc: TrendLevel;
}

// Изменение меньше этого порога считаем шумом, а не реальным трендом.
const RELATIVE_CHANGE_THRESHOLD = 0.02;

function compareHigherIsBetter(current: number, previous: number): TrendLevel {
  if (previous <= 0) return "neutral";
  const change = (current - previous) / previous;
  if (change > RELATIVE_CHANGE_THRESHOLD) return "good";
  if (change < -RELATIVE_CHANGE_THRESHOLD) return "bad";
  return "neutral";
}

function compareLowerIsBetter(current: number, previous: number): TrendLevel {
  if (previous <= 0) return "neutral";
  const change = (current - previous) / previous;
  if (change < -RELATIVE_CHANGE_THRESHOLD) return "good";
  if (change > RELATIVE_CHANGE_THRESHOLD) return "bad";
  return "neutral";
}

export function computeCampaignTrend(
  current: CampaignSummary,
  previous: CampaignSummary | undefined
): CampaignTrend | null {
  if (!previous || previous.clicks === 0) return null;
  return {
    ctr: compareHigherIsBetter(current.ctr, previous.ctr),
    cpc: compareLowerIsBetter(current.cpc, previous.cpc),
  };
}

export interface SeoTrend {
  ctr: TrendLevel;
  position: TrendLevel;
}

export function computeSeoTrend(
  current: SeoSummary,
  previous: SeoSummary | undefined
): SeoTrend | null {
  if (!previous || previous.impressions === 0) return null;
  return {
    ctr: compareHigherIsBetter(current.ctr, previous.ctr),
    position: compareLowerIsBetter(current.position, previous.position),
  };
}

// Текст дельты для подписи под KPI-тайлом, например "▲ +8.4% к пред. периоду".
export function fmtDeltaPct(current: number, previous: number): string {
  if (previous <= 0) return "";
  const change = (current - previous) / previous;
  if (Math.abs(change) < RELATIVE_CHANGE_THRESHOLD) return "→ без изменений";
  const arrow = change > 0 ? "▲" : "▼";
  const sign = change > 0 ? "+" : "";
  return `${arrow} ${sign}${(change * 100).toFixed(1)}% к пред. периоду`;
}
