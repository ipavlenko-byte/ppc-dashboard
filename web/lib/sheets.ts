import { google } from "googleapis";
import {
  AdsDailyRow,
  Ga4DailyRow,
  QualifiedLeadsRow,
  AdGroupDailyRow,
  KeywordDailyRow,
  AdCreativeDailyRow,
  SearchTermDailyRow,
} from "./types";

const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

export function sheetsConfigured() {
  return Boolean(SHEET_ID && SERVICE_ACCOUNT_JSON);
}

async function getSheetsClient() {
  const credentials = JSON.parse(SERVICE_ACCOUNT_JSON as string);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

async function readTab(range: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });
    const values = res.data.values ?? [];
    return values.slice(1) as string[][]; // drop header row
  } catch {
    // Вкладка ещё не создана (например, sync-hierarchy.js ещё не запускали) — не роняем дашборд.
    return [];
  }
}

const num = (v: string | undefined) => Number(v ?? 0) || 0;

export async function fetchAdsDaily(): Promise<AdsDailyRow[]> {
  const rows = await readTab("ads_daily!A:F");
  return rows
    .filter((r) => r[0] && r[1])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      impressions: num(r[2]),
      clicks: num(r[3]),
      cost: num(r[4]),
      conversions: num(r[5]),
    }));
}

export async function fetchGa4Daily(): Promise<Ga4DailyRow[]> {
  const rows = await readTab("ga4_daily!A:E");
  return rows
    .filter((r) => r[0] && r[1])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      bounceRate: num(r[2]),
      pagesPerSession: num(r[3]),
      avgSessionDurationSec: num(r[4]),
    }));
}

export async function fetchQualifiedLeads(): Promise<QualifiedLeadsRow[]> {
  const rows = await readTab("qualified_leads!A:C");
  return rows
    .filter((r) => r[0] && r[1])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      qualifiedLeads: num(r[2]),
    }));
}

export async function fetchAdGroupsDaily(): Promise<AdGroupDailyRow[]> {
  const rows = await readTab("ad_groups_daily!A:G");
  return rows
    .filter((r) => r[0] && r[1] && r[2])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      impressions: num(r[3]),
      clicks: num(r[4]),
      cost: num(r[5]),
      conversions: num(r[6]),
    }));
}

export async function fetchKeywordsDaily(): Promise<KeywordDailyRow[]> {
  const rows = await readTab("keywords_daily!A:I");
  return rows
    .filter((r) => r[0] && r[1] && r[2] && r[3])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      keyword: r[3],
      matchType: r[4],
      impressions: num(r[5]),
      clicks: num(r[6]),
      cost: num(r[7]),
      conversions: num(r[8]),
    }));
}

export async function fetchAdCreativesDaily(): Promise<AdCreativeDailyRow[]> {
  const rows = await readTab("ad_creatives_daily!A:I");
  return rows
    .filter((r) => r[0] && r[1] && r[2] && r[3])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      adId: r[3],
      adType: r[4],
      impressions: num(r[5]),
      clicks: num(r[6]),
      cost: num(r[7]),
      conversions: num(r[8]),
    }));
}

export async function fetchSearchTermsDaily(): Promise<SearchTermDailyRow[]> {
  const rows = await readTab("search_terms_daily!A:H");
  return rows
    .filter((r) => r[0] && r[1] && r[2] && r[3])
    .map((r) => ({
      date: r[0],
      campaign: r[1],
      adGroup: r[2],
      searchTerm: r[3],
      impressions: num(r[4]),
      clicks: num(r[5]),
      cost: num(r[6]),
      conversions: num(r[7]),
    }));
}
