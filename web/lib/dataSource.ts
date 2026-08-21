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
  JoinedRow,
} from "./types";
import {
  generateMockAds,
  generateMockGa4,
  generateMockQualifiedLeads,
  generateMockAdGroups,
  generateMockKeywords,
  generateMockAdCreatives,
  generateMockSearchTerms,
  generateMockDevices,
  generateMockGeo,
  generateMockGa4AdGroups,
} from "./mockData";
import { fetchAllSheetData, sheetsConfigured } from "./sheets";
import { joinRows } from "./metrics";

export interface DashboardData {
  rows: JoinedRow[];
  adGroups: AdGroupDailyRow[];
  keywords: KeywordDailyRow[];
  adCreatives: AdCreativeDailyRow[];
  searchTerms: SearchTermDailyRow[];
  devices: DeviceDailyRow[];
  geo: GeoDailyRow[];
  ga4AdGroups: Ga4AdGroupDailyRow[];
  source: "sheets" | "mock";
}

export async function getDashboardData(): Promise<DashboardData> {
  if (sheetsConfigured()) {
    const data = await fetchAllSheetData();
    return {
      rows: joinRows(data.adsDaily, data.ga4Daily, data.qualifiedLeads),
      adGroups: data.adGroupsDaily,
      keywords: data.keywordsDaily,
      adCreatives: data.adCreativesDaily,
      searchTerms: data.searchTermsDaily,
      devices: data.deviceDaily,
      geo: data.geoDaily,
      ga4AdGroups: data.ga4AdGroupDaily,
      source: "sheets",
    };
  }

  const ads: AdsDailyRow[] = generateMockAds(30);
  const ga4: Ga4DailyRow[] = generateMockGa4(ads);
  const leads: QualifiedLeadsRow[] = generateMockQualifiedLeads(ads);
  const adGroups = generateMockAdGroups(ads);
  const keywords = generateMockKeywords(adGroups);
  const adCreatives = generateMockAdCreatives(adGroups);
  const searchTerms = generateMockSearchTerms(adGroups);
  const devices = generateMockDevices(ads);
  const geo = generateMockGeo(ads);
  const ga4AdGroups = generateMockGa4AdGroups(adGroups);

  return {
    rows: joinRows(ads, ga4, leads),
    adGroups,
    keywords,
    adCreatives,
    searchTerms,
    devices,
    geo,
    ga4AdGroups,
    source: "mock",
  };
}
