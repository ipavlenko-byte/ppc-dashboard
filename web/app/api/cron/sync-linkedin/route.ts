import { upsertDailyRows } from "@/lib/linkedinSheetsWrite";

export const dynamic = "force-dynamic";

// LinkedIn требует версионировать запросы к /rest/* через этот заголовок (формат YYYYMM).
// Если API начнёт возвращать ошибку версии — обновить на более свежий месяц.
const LINKEDIN_VERSION = "202409";
const LOOKBACK_DAYS = 3; // конверсии дозревают, перезаписываем последние дни
const MAX_HISTORY_DAYS = 240;

interface AnalyticsRow {
  date: string;
  campaignId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

interface LinkedInCampaignElement {
  id: number;
  name: string;
}

interface LinkedInAnalyticsElement {
  pivotValues?: string[];
  dateRange?: { start: { year: number; month: number; day: number } };
  impressions?: number;
  clicks?: number;
  costInLocalCurrency?: string;
  externalWebsiteConversions?: number;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await refreshAccessToken();
    const adAccountId = requireEnv("LINKEDIN_AD_ACCOUNT_ID");

    const { from, to } = lookbackRange(LOOKBACK_DAYS);
    const [campaignNames, analyticsRows] = await Promise.all([
      fetchCampaignNames(accessToken, adAccountId),
      fetchAnalytics(accessToken, adAccountId, from, to),
    ]);

    const rows = analyticsRows.map((r) => [
      r.date,
      campaignNames.get(r.campaignId) ?? `Unknown campaign (${r.campaignId})`,
      r.impressions,
      r.clicks,
      r.cost,
      r.conversions,
    ]);

    const result = await upsertDailyRows(
      "linkedin_ads_daily",
      ["date", "campaign", "impressions", "clicks", "cost", "conversions"],
      rows,
      MAX_HISTORY_DAYS
    );

    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("LinkedIn sync failed:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env var ${name} не задана`);
  return v;
}

async function refreshAccessToken(): Promise<string> {
  const clientId = requireEnv("LINKEDIN_CLIENT_ID");
  const clientSecret = requireEnv("LINKEDIN_CLIENT_SECRET");
  const refreshToken = requireEnv("LINKEDIN_REFRESH_TOKEN");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`LinkedIn token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function lookbackRange(days: number): { from: Date; to: Date } {
  const to = new Date();
  to.setDate(to.getDate() - 1); // LinkedIn не отдаёт "сегодня" целиком, как GSC
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from, to };
}

function dateParam(d: Date) {
  return `(year:${d.getFullYear()},month:${d.getMonth() + 1},day:${d.getDate()})`;
}

async function fetchCampaignNames(accessToken: string, adAccountId: string): Promise<Map<string, string>> {
  const url = `https://api.linkedin.com/rest/adAccounts/${adAccountId}/adCampaigns?q=search`;
  const res = await linkedInGet<{ elements: LinkedInCampaignElement[] }>(url, accessToken);
  const map = new Map<string, string>();
  for (const el of res.elements ?? []) {
    // el.id — числовой campaign id, совпадает с последним сегментом campaign URN в analytics-отчёте
    map.set(String(el.id), el.name);
  }
  return map;
}

async function fetchAnalytics(
  accessToken: string,
  adAccountId: string,
  from: Date,
  to: Date
): Promise<AnalyticsRow[]> {
  const dateRange = `(start:${dateParam(from)},end:${dateParam(to)})`;
  const fields = "dateRange,pivotValues,impressions,clicks,costInLocalCurrency,externalWebsiteConversions";
  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange=${encodeURIComponent(dateRange)}` +
    `&accounts=${encodeURIComponent(`List(urn:li:sponsoredAccount:${adAccountId})`)}` +
    `&fields=${fields}`;

  const res = await linkedInGet<{ elements: LinkedInAnalyticsElement[] }>(url, accessToken);
  return (res.elements ?? []).flatMap((el) => {
    const campaignUrn = el.pivotValues?.[0]; // "urn:li:sponsoredCampaign:12345"
    const campaignId = campaignUrn?.split(":").pop();
    const d = el.dateRange?.start;
    if (!campaignId || !d) return [];
    return [
      {
        date: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`,
        campaignId,
        impressions: Number(el.impressions ?? 0),
        clicks: Number(el.clicks ?? 0),
        cost: Number(el.costInLocalCurrency ?? 0),
        conversions: Number(el.externalWebsiteConversions ?? 0),
      },
    ];
  });
}

async function linkedInGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!res.ok) {
    throw new Error(`LinkedIn API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
