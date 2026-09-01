import { CampaignSummary } from "./metrics";
import { CampaignTrend } from "./trends";
import { fmtMoneyDual } from "./format";

export type RecommendationSeverity = "critical" | "warning";

export interface Recommendation {
  campaign: string;
  severity: RecommendationSeverity;
  title: string;
  advice: string;
}

const BOUNCE_RATE_CRITICAL = 0.7;
const CPL_WARNING_MULTIPLIER = 1.5;
const CTR_WARNING = 0.01;
const LOST_IS_WARNING = 0.2;
const QUALIFIED_RATE_WARNING = 0.3;
const MIN_CONVERSIONS_FOR_QUALIFIED_CHECK = 5;
const ZERO_CONV_SPEND_FALLBACK_HKD = 100; // если у кампании нет dailyBudget (не Search)

// Правила эвристические, без вызова каких-либо платных API — те же пороги,
// что уже используются в anomalies.ts (bounce rate/CPL/CTR), плюс несколько
// новых на основе Impression Share, тренда к прошлому периоду и доли
// квалифицированных лидов.
export function generateRecommendations(
  campaigns: CampaignSummary[],
  accountAvgCpl: number,
  trendByCampaign?: Map<string, CampaignTrend | null>
): Recommendation[] {
  const out: Recommendation[] = [];

  for (const c of campaigns) {
    if (c.bounceRate !== null && c.bounceRate > BOUNCE_RATE_CRITICAL) {
      out.push({
        campaign: c.campaign,
        severity: "critical",
        title: `Высокий процент отказов (${(c.bounceRate * 100).toFixed(0)}%)`,
        advice: "Проверьте релевантность посадочной страницы объявлению и скорость её загрузки.",
      });
    }

    if (c.conversions === 0 && c.cost > (c.dailyBudget ?? ZERO_CONV_SPEND_FALLBACK_HKD) * 2) {
      out.push({
        campaign: c.campaign,
        severity: "critical",
        title: `Потрачено ${fmtMoneyDual(c.cost)} без единой заявки`,
        advice: "Пересмотрите таргетинг, минус-слова и соответствие посадочной страницы запросу.",
      });
    }

    if (c.conversions > 0 && accountAvgCpl > 0 && c.cpl > accountAvgCpl * CPL_WARNING_MULTIPLIER) {
      out.push({
        campaign: c.campaign,
        severity: "warning",
        title: `CPL выше среднего по аккаунту в ${(c.cpl / accountAvgCpl).toFixed(1)}x`,
        advice: "Проверьте ставки и качество трафика — возможно, стоит сузить гео/устройства/аудиторию.",
      });
    }

    if (c.clicks > 0 && c.ctr < CTR_WARNING) {
      out.push({
        campaign: c.campaign,
        severity: "warning",
        title: `Низкий CTR (${(c.ctr * 100).toFixed(1)}%)`,
        advice: "Обновите тексты объявлений/креативы, проверьте соответствие ключевым словам.",
      });
    }

    if (c.searchBudgetLostIS !== null && c.searchBudgetLostIS > LOST_IS_WARNING) {
      out.push({
        campaign: c.campaign,
        severity: "warning",
        title: `Теряется ${(c.searchBudgetLostIS * 100).toFixed(0)}% показов из-за бюджета`,
        advice: `Рассмотрите увеличение дневного бюджета (сейчас ${c.dailyBudget !== null ? fmtMoneyDual(c.dailyBudget) : "не задан"}).`,
      });
    }

    if (c.searchRankLostIS !== null && c.searchRankLostIS > LOST_IS_WARNING) {
      out.push({
        campaign: c.campaign,
        severity: "warning",
        title: `Теряется ${(c.searchRankLostIS * 100).toFixed(0)}% показов из-за низкого Ad Rank`,
        advice: "Проверьте ставки и показатель качества объявлений (релевантность, ожидаемый CTR, посадочная страница).",
      });
    }

    if (
      c.conversions >= MIN_CONVERSIONS_FOR_QUALIFIED_CHECK &&
      c.qualifiedLeads / c.conversions < QUALIFIED_RATE_WARNING
    ) {
      out.push({
        campaign: c.campaign,
        severity: "warning",
        title: `Только ${((c.qualifiedLeads / c.conversions) * 100).toFixed(0)}% заявок квалифицированные`,
        advice: "Много лидов, но мало качественных — проверьте, не привлекает ли кампания нецелевую аудиторию (гео/устройства/креативы).",
      });
    }

    const trend = trendByCampaign?.get(c.campaign);
    if (trend && trend.ctr === "bad" && trend.cpc === "bad") {
      out.push({
        campaign: c.campaign,
        severity: "warning",
        title: "CTR и CPC одновременно ухудшились к прошлому периоду",
        advice: "Стоит разобраться, что изменилось — конкуренция, сезонность, усталость креативов или настройки кампании.",
      });
    }
  }

  // Критичные — вперёд; внутри одного уровня сохраняем порядок кампаний по тратам
  // (summarizeByCampaign уже сортирует campaigns по cost desc).
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}
