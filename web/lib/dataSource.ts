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
  generateMockLandingPages,
  generateMockGscQueries,
  generateMockGscPages,
  generateMockGscCountries,
  generateMockGscDevices,
  generateMockGscQueryCountry,
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
  landingPages: LandingPageDailyRow[];
  gscQueries: GscQueryDailyRow[];
  gscPages: GscPageDailyRow[];
  gscCountries: GscCountryDailyRow[];
  gscDevices: GscDeviceDailyRow[];
  gscQueryCountry: GscQueryCountryDailyRow[];
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
      landingPages: data.landingPagesDaily,
      gscQueries: data.gscQueryDaily,
      gscPages: data.gscPageDaily,
      gscCountries: data.gscCountryDaily,
      gscDevices: data.gscDeviceDaily,
      gscQueryCountry: data.gscQueryCountryDaily,
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
  const landingPages = generateMockLandingPages(ads);
  const gscQueries = generateMockGscQueries(30);
  const gscPages = generateMockGscPages(30);
  const gscCountries = generateMockGscCountries(30);
  const gscDevices = generateMockGscDevices(30);
  const gscQueryCountry = generateMockGscQueryCountry(30);

  return {
    rows: joinRows(ads, ga4, leads),
    adGroups,
    keywords,
    adCreatives,
    searchTerms,
    devices,
    geo,
    ga4AdGroups,
    landingPages,
    gscQueries,
    gscPages,
    gscCountries,
    gscDevices,
    gscQueryCountry,
    source: "mock",
  };
}
