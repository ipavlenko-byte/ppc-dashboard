export interface AdsDailyRow {
  date: string; // YYYY-MM-DD
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number; // leads (заявки)
  searchImpressionShare: number | null; // 0-1, только для Search-кампаний
  searchBudgetLostIS: number | null;
  searchRankLostIS: number | null;
  dailyBudget: number | null;
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

export interface AdMetricsBase {
  date: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface LinkedInAdsDailyRow extends AdMetricsBase {
  campaignGroup: string;
}

export interface LinkedInCampaignGroupRow {
  id: string;
  name: string;
}

export interface LinkedInCreativeDailyRow extends AdMetricsBase {
  creative: string;
}

export interface LinkedInTargetingRow {
  campaign: string;
  facetType: string;
  value: string;
}

export interface LinkedInAudienceRow {
  campaign: string;
  dimension: string; // Должности / Уровень должности / Индустрия
  value: string;
  impressions: number;
  clicks: number;
  cost: number;
}

export interface AdGroupDailyRow extends AdMetricsBase {
  adGroup: string;
}

export interface KeywordDailyRow extends AdMetricsBase {
  adGroup: string;
  keyword: string;
  matchType: string;
}

export interface AdCreativeDailyRow extends AdMetricsBase {
  adGroup: string;
  adId: string;
  adType: string;
}

export interface SearchTermDailyRow extends AdMetricsBase {
  adGroup: string;
  searchTerm: string;
}

export interface DeviceDailyRow extends AdMetricsBase {
  device: string;
}

export interface GeoDailyRow extends AdMetricsBase {
  country: string;
}

export interface LandingPageDailyRow extends AdMetricsBase {
  landingPage: string;
}

export interface Ga4AdGroupDailyRow {
  date: string;
  campaign: string;
  adGroup: string;
  bounceRate: number;
  pagesPerSession: number;
  avgSessionDurationSec: number;
}

export interface GscQueryDailyRow {
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPageDailyRow {
  date: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscCountryDailyRow {
  date: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscDeviceDailyRow {
  date: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryCountryDailyRow {
  date: string;
  query: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface Ga4TrafficMonthlyRow {
  yearMonth: string; // YYYY-MM
  bucket: string; // Direct / Search: Google / Search: Other / Ads: Google / Ads: Other / Websites / AI / Social Networks / Other
  users: number;
}

export interface Ga4TrafficSummaryMonthlyRow {
  yearMonth: string;
  totalUsers: number;
  bounceRate: number; // 0-1
}

export interface FunnelMonthlyRow {
  month: string; // YYYY-MM
  users: number;
  clients: number;
}

export interface FunnelLeadsMonthlyRow {
  month: string; // YYYY-MM
  source: string; // Google CPC / Organic / Direct / Referral / AI / Other
  leads: number;
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
  searchImpressionShare: number | null;
  searchBudgetLostIS: number | null;
  searchRankLostIS: number | null;
  dailyBudget: number | null;
}
