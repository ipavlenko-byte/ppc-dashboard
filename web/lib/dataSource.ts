import { AdsDailyRow, Ga4DailyRow, QualifiedLeadsRow, JoinedRow } from "./types";
import { generateMockAds, generateMockGa4, generateMockQualifiedLeads } from "./mockData";
import { fetchAdsDaily, fetchGa4Daily, fetchQualifiedLeads, sheetsConfigured } from "./sheets";
import { joinRows } from "./metrics";

export interface DashboardData {
  rows: JoinedRow[];
  source: "sheets" | "mock";
}

export async function getDashboardData(): Promise<DashboardData> {
  if (sheetsConfigured()) {
    const [ads, ga4, leads] = await Promise.all([
      fetchAdsDaily(),
      fetchGa4Daily(),
      fetchQualifiedLeads(),
    ]);
    return { rows: joinRows(ads, ga4, leads), source: "sheets" };
  }

  const ads: AdsDailyRow[] = generateMockAds(30);
  const ga4: Ga4DailyRow[] = generateMockGa4(ads);
  const leads: QualifiedLeadsRow[] = generateMockQualifiedLeads(ads);
  return { rows: joinRows(ads, ga4, leads), source: "mock" };
}
