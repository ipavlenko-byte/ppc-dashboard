import { CampaignSummary } from "./metrics";

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
