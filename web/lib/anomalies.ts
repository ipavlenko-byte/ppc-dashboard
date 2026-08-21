import { CampaignSummary } from "./metrics";

export type AnomalyLevel = "critical" | "warning" | null;

export interface AnomalyFlag {
  level: AnomalyLevel;
  reasons: string[];
}

const BOUNCE_RATE_CRITICAL = 0.7;
const CPL_WARNING_MULTIPLIER = 1.5;
const CTR_WARNING = 0.01;

export function flagCampaign(c: CampaignSummary, accountAvgCpl: number): AnomalyFlag {
  const reasons: string[] = [];
  let level: AnomalyLevel = null;

  if (c.bounceRate !== null && c.bounceRate > BOUNCE_RATE_CRITICAL) {
    level = "critical";
    reasons.push(`Высокий процент отказов (${(c.bounceRate * 100).toFixed(0)}%)`);
  }

  if (c.conversions > 0 && accountAvgCpl > 0 && c.cpl > accountAvgCpl * CPL_WARNING_MULTIPLIER) {
    if (level !== "critical") level = "warning";
    reasons.push(`CPL выше среднего по аккаунту в ${(c.cpl / accountAvgCpl).toFixed(1)}x`);
  }

  if (c.clicks > 0 && c.ctr < CTR_WARNING) {
    if (level !== "critical") level = "warning";
    reasons.push(`Низкий CTR (${(c.ctr * 100).toFixed(1)}%)`);
  }

  return { level, reasons };
}
