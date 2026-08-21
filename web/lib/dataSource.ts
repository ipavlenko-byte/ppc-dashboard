import {
  AdsDailyRow,
  Ga4DailyRow,
  QualifiedLeadsRow,
  AdGroupDailyRow,
  KeywordDailyRow,
  AdCreativeDailyRow,
  SearchTermDailyRow,
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
} from "./mockData";
import {
  fetchAdsDaily,
  fetchGa4Daily,
  fetchQualifiedLeads,
  fetchAdGroupsDaily,
  fetchKeywordsDaily,
  fetchAdCreativesDaily,
  fetchSearchTermsDaily,
  sheetsConfigured,
} from "./sheets";
import { joinRows } from "./metrics";

export interface DashboardData {
  rows: JoinedRow[];
  adGroups: AdGroupDailyRow[];
  keywords: KeywordDailyRow[];
  adCreatives: AdCreativeDailyRow[];
  searchTerms: SearchTermDailyRow[];
  source: "sheets" | "mock";
}

export async function getDashboardData(): Promise<DashboardData> {
  if (sheetsConfigured()) {
    const [ads, ga4, leads, adGroups, keywords, adCreatives, searchTerms] = await Promise.all([
      fetchAdsDaily(),
      fetchGa4Daily(),
      fetchQualifiedLeads(),
      fetchAdGroupsDaily(),
      fetchKeywordsDaily(),
      fetchAdCreativesDaily(),
      fetchSearchTermsDaily(),
    ]);
    return {
      rows: joinRows(ads, ga4, leads),
      adGroups,
      keywords,
      adCreatives,
      searchTerms,
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

  return {
    rows: joinRows(ads, ga4, leads),
    adGroups,
    keywords,
    adCreatives,
    searchTerms,
    source: "mock",
  };
}
