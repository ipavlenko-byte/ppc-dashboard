import {
  AdsDailyRow,
  Ga4DailyRow,
  QualifiedLeadsRow,
  AdGroupDailyRow,
  KeywordDailyRow,
  AdCreativeDailyRow,
  SearchTermDailyRow,
  DeviceDailyRow,
  GeoDailyRow,
  Ga4AdGroupDailyRow,
} from "./types";

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
  return ads.map((r) => {
    // Sellvia_DG_* специально сделана "проблемной" — высокий отказ, для проверки подсветки аномалий.
    const isProblemCampaign = r.campaign.includes("Sellvia_DG");
    const bounceRate = isProblemCampaign
      ? Math.round((0.72 + rand() * 0.15) * 100) / 100
      : Math.round((0.2 + rand() * 0.3) * 100) / 100;
    return {
      date: r.date,
      campaign: r.campaign,
      bounceRate,
      pagesPerSession: Math.round((1.2 + rand() * 1.2) * 100) / 100,
      avgSessionDurationSec: Math.round(40 + rand() * 140),
    };
  });
}

export function generateMockQualifiedLeads(ads: AdsDailyRow[]): QualifiedLeadsRow[] {
  const rand = seedRandom(99);
  return ads.map((r) => ({
    date: r.date,
    campaign: r.campaign,
    qualifiedLeads: Math.round(r.conversions * (0.25 + rand() * 0.45)),
  }));
}

const AD_GROUPS = ["Broad Match", "Exact Match", "Brand Terms"];
const KEYWORDS_BY_GROUP: Record<string, string[]> = {
  "Broad Match": ["game localization services", "video game translation", "outsource art games"],
  "Exact Match": ["[game localization]", "[game art outsourcing]"],
  "Brand Terms": ["allcorrect games", "allcorrect localization"],
};
const MATCH_TYPE_BY_GROUP: Record<string, string> = {
  "Broad Match": "BROAD",
  "Exact Match": "EXACT",
  "Brand Terms": "PHRASE",
};
const SEARCH_TERMS_POOL = [
  "game localization company",
  "best game translation service",
  "art outsourcing studio",
  "localize mobile game",
  "allcorrect games reviews",
  "game QA testing service",
  "indie game translation",
  "video game art outsourcing",
];

function splitMetric(total: number, parts: number, rand: () => number) {
  const weights = Array.from({ length: parts }, () => 0.4 + rand() * 0.6);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / sum) * total));
}

export function generateMockAdGroups(ads: AdsDailyRow[]): AdGroupDailyRow[] {
  const rand = seedRandom(11);
  const rows: AdGroupDailyRow[] = [];
  for (const r of ads) {
    const [imp1, imp2, imp3] = splitMetric(r.impressions, 3, rand);
    const [clk1, clk2, clk3] = splitMetric(r.clicks, 3, rand);
    const [cost1, cost2, cost3] = splitMetric(r.cost, 3, rand);
    const [conv1, conv2, conv3] = splitMetric(r.conversions, 3, rand);
    const values = [
      [imp1, clk1, cost1, conv1],
      [imp2, clk2, cost2, conv2],
      [imp3, clk3, cost3, conv3],
    ];
    AD_GROUPS.forEach((adGroup, i) => {
      rows.push({
        date: r.date,
        campaign: r.campaign,
        adGroup,
        impressions: values[i][0],
        clicks: values[i][1],
        cost: values[i][2],
        conversions: values[i][3],
      });
    });
  }
  return rows;
}

export function generateMockKeywords(adGroups: AdGroupDailyRow[]): KeywordDailyRow[] {
  const rand = seedRandom(13);
  const rows: KeywordDailyRow[] = [];
  for (const r of adGroups) {
    const keywords = KEYWORDS_BY_GROUP[r.adGroup] ?? ["generic keyword"];
    const impParts = splitMetric(r.impressions, keywords.length, rand);
    const clkParts = splitMetric(r.clicks, keywords.length, rand);
    const costParts = splitMetric(r.cost, keywords.length, rand);
    const convParts = splitMetric(r.conversions, keywords.length, rand);
    keywords.forEach((keyword, i) => {
      rows.push({
        date: r.date,
        campaign: r.campaign,
        adGroup: r.adGroup,
        keyword,
        matchType: MATCH_TYPE_BY_GROUP[r.adGroup] ?? "BROAD",
        impressions: impParts[i],
        clicks: clkParts[i],
        cost: costParts[i],
        conversions: convParts[i],
      });
    });
  }
  return rows;
}

export function generateMockAdCreatives(adGroups: AdGroupDailyRow[]): AdCreativeDailyRow[] {
  const rand = seedRandom(17);
  const rows: AdCreativeDailyRow[] = [];
  for (const r of adGroups) {
    const [imp1, imp2] = splitMetric(r.impressions, 2, rand);
    const [clk1, clk2] = splitMetric(r.clicks, 2, rand);
    const [cost1, cost2] = splitMetric(r.cost, 2, rand);
    const [conv1, conv2] = splitMetric(r.conversions, 2, rand);
    rows.push(
      {
        date: r.date,
        campaign: r.campaign,
        adGroup: r.adGroup,
        adId: `${r.adGroup.slice(0, 3).toUpperCase()}-RSA-1`,
        adType: "RESPONSIVE_SEARCH_AD",
        impressions: imp1,
        clicks: clk1,
        cost: cost1,
        conversions: conv1,
      },
      {
        date: r.date,
        campaign: r.campaign,
        adGroup: r.adGroup,
        adId: `${r.adGroup.slice(0, 3).toUpperCase()}-RSA-2`,
        adType: "RESPONSIVE_SEARCH_AD",
        impressions: imp2,
        clicks: clk2,
        cost: cost2,
        conversions: conv2,
      }
    );
  }
  return rows;
}

const DEVICES = ["MOBILE", "DESKTOP", "TABLET"];
const DEVICE_SHARE = [0.55, 0.4, 0.05];
const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Singapore"];
const COUNTRY_SHARE = [0.5, 0.15, 0.15, 0.12, 0.08];

export function generateMockDevices(ads: AdsDailyRow[]): DeviceDailyRow[] {
  const rand = seedRandom(23);
  const rows: DeviceDailyRow[] = [];
  for (const r of ads) {
    const impParts = splitByShare(r.impressions, DEVICE_SHARE, rand);
    const clkParts = splitByShare(r.clicks, DEVICE_SHARE, rand);
    const costParts = splitByShare(r.cost, DEVICE_SHARE, rand);
    const convParts = splitByShare(r.conversions, DEVICE_SHARE, rand);
    DEVICES.forEach((device, i) => {
      rows.push({
        date: r.date,
        campaign: r.campaign,
        device,
        impressions: impParts[i],
        clicks: clkParts[i],
        cost: costParts[i],
        conversions: convParts[i],
      });
    });
  }
  return rows;
}

export function generateMockGeo(ads: AdsDailyRow[]): GeoDailyRow[] {
  const rand = seedRandom(29);
  const rows: GeoDailyRow[] = [];
  for (const r of ads) {
    const impParts = splitByShare(r.impressions, COUNTRY_SHARE, rand);
    const clkParts = splitByShare(r.clicks, COUNTRY_SHARE, rand);
    const costParts = splitByShare(r.cost, COUNTRY_SHARE, rand);
    const convParts = splitByShare(r.conversions, COUNTRY_SHARE, rand);
    COUNTRIES.forEach((country, i) => {
      rows.push({
        date: r.date,
        campaign: r.campaign,
        country,
        impressions: impParts[i],
        clicks: clkParts[i],
        cost: costParts[i],
        conversions: convParts[i],
      });
    });
  }
  return rows;
}

export function generateMockGa4AdGroups(adGroups: AdGroupDailyRow[]): Ga4AdGroupDailyRow[] {
  const rand = seedRandom(31);
  return adGroups.map((r) => ({
    date: r.date,
    campaign: r.campaign,
    adGroup: r.adGroup,
    bounceRate: Math.round((0.2 + rand() * 0.35) * 100) / 100,
    pagesPerSession: Math.round((1.1 + rand() * 1.3) * 100) / 100,
    avgSessionDurationSec: Math.round(35 + rand() * 150),
  }));
}

function splitByShare(total: number, shares: number[], rand: () => number): number[] {
  const jittered = shares.map((s) => s * (0.85 + rand() * 0.3));
  const sum = jittered.reduce((a, b) => a + b, 0);
  return jittered.map((s) => Math.round((s / sum) * total));
}

export function generateMockSearchTerms(adGroups: AdGroupDailyRow[]): SearchTermDailyRow[] {
  const rand = seedRandom(19);
  const rows: SearchTermDailyRow[] = [];
  for (const r of adGroups) {
    const termCount = 2 + Math.floor(rand() * 3);
    const terms = Array.from(
      { length: termCount },
      () => SEARCH_TERMS_POOL[Math.floor(rand() * SEARCH_TERMS_POOL.length)]
    );
    const impParts = splitMetric(r.impressions, terms.length, rand);
    const clkParts = splitMetric(r.clicks, terms.length, rand);
    const costParts = splitMetric(r.cost, terms.length, rand);
    const convParts = splitMetric(r.conversions, terms.length, rand);
    terms.forEach((searchTerm, i) => {
      rows.push({
        date: r.date,
        campaign: r.campaign,
        adGroup: r.adGroup,
        searchTerm,
        impressions: impParts[i],
        clicks: clkParts[i],
        cost: costParts[i],
        conversions: convParts[i],
      });
    });
  }
  return rows;
}
