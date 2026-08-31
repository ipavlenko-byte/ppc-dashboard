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
  LandingPageDailyRow,
  GscQueryDailyRow,
  GscPageDailyRow,
  GscCountryDailyRow,
  GscDeviceDailyRow,
  GscQueryCountryDailyRow,
  Ga4TrafficMonthlyRow,
  Ga4TrafficSummaryMonthlyRow,
  FunnelMonthlyRow,
  FunnelLeadsMonthlyRow,
} from "./types";

const CAMPAIGNS = [
  { name: "Sellvia_Pmax_US_CAN_UK_AUS_SG #2", baseCost: 3200, baseCtr: 0.059, baseCr: 0.266, dailyBudget: 120 },
  { name: "Sellvia_pmax_page_feed - video_US_CAN", baseCost: 1300, baseCtr: 0.048, baseCr: 0.244, dailyBudget: 50 },
  { name: "Sellvia_DP_US_UK_CAN_AUS_SG", baseCost: 930, baseCtr: 0.039, baseCr: 0.203, dailyBudget: 35 },
  { name: "Sellvia_Search_All_US", baseCost: 750, baseCtr: 0.086, baseCr: 0.308, dailyBudget: 25 },
  { name: "Sellvia_DG_US_UK_AU_CAN_2", baseCost: 460, baseCtr: 0.005, baseCr: 0.134, dailyBudget: 15 },
];

const LANDING_PAGES = [
  "https://sellvia.com/store/",
  "https://sellvia.com/dropshipping/",
  "https://sellvia.com/pricing/",
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
      const isSearchCampaign = c.name.includes("Search");
      rows.push({
        date,
        campaign: c.name,
        impressions,
        clicks,
        cost,
        conversions,
        searchImpressionShare: isSearchCampaign ? Math.round((0.35 + rand() * 0.4) * 100) / 100 : null,
        searchBudgetLostIS: isSearchCampaign ? Math.round(rand() * 0.2 * 100) / 100 : null,
        searchRankLostIS: isSearchCampaign ? Math.round(rand() * 0.15 * 100) / 100 : null,
        dailyBudget: c.dailyBudget,
      });
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

export function generateMockLandingPages(ads: AdsDailyRow[]): LandingPageDailyRow[] {
  const rand = seedRandom(37);
  const rows: LandingPageDailyRow[] = [];
  for (const r of ads) {
    const shares = LANDING_PAGES.map(() => 0.2 + rand() * 0.6);
    const impParts = splitByShare(r.impressions, shares, rand);
    const clkParts = splitByShare(r.clicks, shares, rand);
    const costParts = splitByShare(r.cost, shares, rand);
    const convParts = splitByShare(r.conversions, shares, rand);
    LANDING_PAGES.forEach((landingPage, i) => {
      rows.push({
        date: r.date,
        campaign: r.campaign,
        landingPage,
        impressions: impParts[i],
        clicks: clkParts[i],
        cost: costParts[i],
        conversions: convParts[i],
      });
    });
  }
  return rows;
}

const GSC_QUERIES = [
  { text: "game localization services", basePosition: 4.2, baseCtr: 0.09 },
  { text: "allcorrect games", basePosition: 1.3, baseCtr: 0.35 },
  { text: "video game translation company", basePosition: 6.8, baseCtr: 0.05 },
  { text: "outsource game art", basePosition: 8.5, baseCtr: 0.03 },
  { text: "game qa testing outsourcing", basePosition: 5.4, baseCtr: 0.07 },
  { text: "indie game localization", basePosition: 3.1, baseCtr: 0.11 },
  { text: "mobile game translation service", basePosition: 9.2, baseCtr: 0.025 },
  { text: "game dubbing studio", basePosition: 11.4, baseCtr: 0.018 },
];

const GSC_PAGES = [
  "https://allcorrectgames.com/",
  "https://allcorrectgames.com/localization/",
  "https://allcorrectgames.com/art-outsourcing/",
  "https://allcorrectgames.com/qa-testing/",
  "https://allcorrectgames.com/blog/game-localization-guide/",
];

function generateMockDateRange(days: number): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toISODate(d));
  }
  return dates;
}

export function generateMockGscQueries(days = 30): GscQueryDailyRow[] {
  const rand = seedRandom(41);
  const rows: GscQueryDailyRow[] = [];
  for (const date of generateMockDateRange(days)) {
    for (const q of GSC_QUERIES) {
      const jitter = 0.75 + rand() * 0.5;
      const impressions = Math.round((80 + rand() * 400) * jitter);
      const ctr = Math.max(0.005, q.baseCtr * (0.8 + rand() * 0.4));
      const clicks = Math.round(impressions * ctr);
      const position = Math.max(1, q.basePosition + (rand() - 0.5) * 1.5);
      rows.push({
        date,
        query: q.text,
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: Math.round(position * 10) / 10,
      });
    }
  }
  return rows;
}

export function generateMockGscPages(days = 30): GscPageDailyRow[] {
  const rand = seedRandom(43);
  const rows: GscPageDailyRow[] = [];
  const shares = GSC_PAGES.map(() => 0.2 + rand() * 0.6);
  for (const date of generateMockDateRange(days)) {
    const totalImpressions = Math.round(1200 + rand() * 2000);
    const impParts = splitByShare(totalImpressions, shares, rand);
    GSC_PAGES.forEach((page, i) => {
      const impressions = impParts[i];
      const ctr = Math.max(0.005, 0.03 + rand() * 0.08);
      const clicks = Math.round(impressions * ctr);
      const position = Math.max(1, 2 + i * 2.5 + (rand() - 0.5) * 1.5);
      rows.push({
        date,
        page,
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: Math.round(position * 10) / 10,
      });
    });
  }
  return rows;
}

export function generateMockGscCountries(days = 30): GscCountryDailyRow[] {
  const rand = seedRandom(47);
  const rows: GscCountryDailyRow[] = [];
  for (const date of generateMockDateRange(days)) {
    const totalImpressions = Math.round(1200 + rand() * 2000);
    const impParts = splitByShare(totalImpressions, COUNTRY_SHARE, rand);
    COUNTRIES.forEach((country, i) => {
      const impressions = impParts[i];
      const ctr = Math.max(0.005, 0.03 + rand() * 0.08);
      const clicks = Math.round(impressions * ctr);
      const position = Math.max(1, 3 + i * 1.8 + (rand() - 0.5) * 1.5);
      rows.push({
        date,
        country,
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: Math.round(position * 10) / 10,
      });
    });
  }
  return rows;
}

export function generateMockGscDevices(days = 30): GscDeviceDailyRow[] {
  const rand = seedRandom(53);
  const rows: GscDeviceDailyRow[] = [];
  for (const date of generateMockDateRange(days)) {
    const totalImpressions = Math.round(1200 + rand() * 2000);
    const impParts = splitByShare(totalImpressions, DEVICE_SHARE, rand);
    DEVICES.forEach((device, i) => {
      const impressions = impParts[i];
      const ctr = Math.max(0.005, 0.03 + rand() * 0.08);
      const clicks = Math.round(impressions * ctr);
      const position = Math.max(1, 4 + i * 1.2 + (rand() - 0.5) * 1.5);
      rows.push({
        date,
        device,
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: Math.round(position * 10) / 10,
      });
    });
  }
  return rows;
}

export function generateMockGscQueryCountry(days = 30): GscQueryCountryDailyRow[] {
  const rand = seedRandom(59);
  const rows: GscQueryCountryDailyRow[] = [];
  for (const date of generateMockDateRange(days)) {
    for (const q of GSC_QUERIES) {
      const qImpressions = Math.round((80 + rand() * 400) * (0.75 + rand() * 0.5));
      const impParts = splitByShare(qImpressions, COUNTRY_SHARE, rand);
      COUNTRIES.forEach((country, i) => {
        const impressions = impParts[i];
        const ctr = Math.max(0.005, q.baseCtr * (0.8 + rand() * 0.4));
        const clicks = Math.round(impressions * ctr);
        const position = Math.max(1, q.basePosition + (rand() - 0.5) * 2);
        rows.push({
          date,
          query: q.text,
          country,
          clicks,
          impressions,
          ctr: impressions > 0 ? clicks / impressions : 0,
          position: Math.round(position * 10) / 10,
        });
      });
    }
  }
  return rows;
}

function generateMockYearMonths(n: number): string[] {
  const months: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

const TRAFFIC_BUCKET_SHARE: [string, number][] = [
  ["Direct", 0.2],
  ["Search: Google", 0.28],
  ["Search: Other", 0.04],
  ["Ads: Google", 0.18],
  ["Ads: Other", 0.03],
  ["Websites", 0.12],
  ["AI", 0.06],
  ["Social Networks", 0.07],
  ["Other", 0.02],
];

export function generateMockGa4Traffic(months = 12): Ga4TrafficMonthlyRow[] {
  const rand = seedRandom(61);
  const rows: Ga4TrafficMonthlyRow[] = [];
  for (const yearMonth of generateMockYearMonths(months)) {
    const totalUsers = Math.round(6000 + rand() * 4000);
    const shares = TRAFFIC_BUCKET_SHARE.map(([, s]) => s * (0.85 + rand() * 0.3));
    const sum = shares.reduce((a, b) => a + b, 0);
    TRAFFIC_BUCKET_SHARE.forEach(([bucket], i) => {
      rows.push({ yearMonth, bucket, users: Math.round((shares[i] / sum) * totalUsers) });
    });
  }
  return rows;
}

export function generateMockGa4TrafficSummary(rows: Ga4TrafficMonthlyRow[]): Ga4TrafficSummaryMonthlyRow[] {
  const rand = seedRandom(67);
  const months = Array.from(new Set(rows.map((r) => r.yearMonth)));
  return months.map((yearMonth) => {
    const totalUsers = rows.filter((r) => r.yearMonth === yearMonth).reduce((s, r) => s + r.users, 0);
    return {
      yearMonth,
      totalUsers,
      bounceRate: Math.round((0.35 + rand() * 0.2) * 100) / 100,
    };
  });
}

const FUNNEL_SOURCES = ["Google CPC", "Organic", "Direct", "Referral", "AI", "Other"];

export function generateMockFunnelMonthly(months = 20): FunnelMonthlyRow[] {
  const rand = seedRandom(71);
  return generateMockYearMonths(months).map((month) => {
    const users = Math.round(2500 + rand() * 3000);
    const clients = Math.round(2 + rand() * 6);
    return { month, users, clients };
  });
}

export function generateMockFunnelLeadsMonthly(months = 20): FunnelLeadsMonthlyRow[] {
  const rand = seedRandom(73);
  const rows: FunnelLeadsMonthlyRow[] = [];
  for (const month of generateMockYearMonths(months)) {
    for (const source of FUNNEL_SOURCES) {
      const leads = Math.round(3 + rand() * 20);
      const qualifiedLeads = Math.round(leads * (0.2 + rand() * 0.4));
      rows.push({ month, source, leads, qualifiedLeads });
    }
  }
  return rows;
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
