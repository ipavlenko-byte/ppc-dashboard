import { upsertDailyRows } from "@/lib/linkedinSheetsWrite";
import { HKD_PER_USD } from "@/lib/format";

export const dynamic = "force-dynamic";

// LinkedIn требует версионировать запросы к /rest/* через этот заголовок (формат YYYYMM).
// Версии "гаснут" примерно через год — если начнёт возвращать 426 NONEXISTENT_VERSION,
// обновить на более свежий месяц.
const LINKEDIN_VERSION = "202601";
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

interface LinkedInCampaignsPage {
  elements: LinkedInCampaignElement[];
  metadata?: { nextPageToken?: string };
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
  const map = new Map<string, string>();
  // Аккаунт может держать сотни архивных кампаний — /adCampaigns отдаёт их
  // курсорной пагинацией (metadata.nextPageToken), а не одной страницей.
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url =
      `https://api.linkedin.com/rest/adAccounts/${adAccountId}/adCampaigns?q=search` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const res = await linkedInGet<LinkedInCampaignsPage>(url, accessToken);
    for (const el of res.elements ?? []) {
      // el.id — числовой campaign id, совпадает с последним сегментом campaign URN в analytics-отчёте
      map.set(String(el.id), el.name);
    }
    pageToken = res.metadata?.nextPageToken;
    if (!pageToken) break;
  }
  return map;
}

async function fetchAnalytics(
  accessToken: string,
  adAccountId: string,
  from: Date,
  to: Date
): Promise<AnalyticsRow[]> {
  // LinkedIn's Rest.li "reduced" query syntax wants the structural characters
  // (parens/colons/commas) literal in the URL, not percent-encoded — wrapping
  // this in encodeURIComponent() (as URLSearchParams would) breaks parsing and
  // returns a generic 400. Only the URN's colons are escaped, matching what
  // LinkedIn's own docs/examples show.
  const dateRange = `(start:${dateParam(from)},end:${dateParam(to)})`;
  const fields = "dateRange,pivotValues,impressions,clicks,costInLocalCurrency,externalWebsiteConversions";
  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY` +
    `&dateRange=${dateRange}` +
    `&accounts=List(urn%3Ali%3AsponsoredAccount%3A${adAccountId})` +
    `&fields=${fields}`;

  const [res, costToHkd] = await Promise.all([
    linkedInGet<{ elements: LinkedInAnalyticsElement[] }>(url, accessToken),
    costToHkdMultiplier(accessToken, adAccountId),
  ]);

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
        cost: Number(el.costInLocalCurrency ?? 0) * costToHkd,
        conversions: Number(el.externalWebsiteConversions ?? 0),
      },
    ];
  });
}

// costInLocalCurrency приходит в валюте биллинга рекламного аккаунта (не всегда
// та же, что у Google Ads) — весь остальной дашборд хранит cost в HKD
// (fmtMoneyDual/fmtUsd везде считают вход за HKD), поэтому конвертируем на записи,
// а не размазываем спецслучай по компонентам отображения.
async function costToHkdMultiplier(accessToken: string, adAccountId: string): Promise<number> {
  const res = await linkedInGet<{ currency?: string }>(
    `https://api.linkedin.com/rest/adAccounts/${adAccountId}`,
    accessToken
  );
  if (res.currency === "HKD") return 1;
  if (res.currency === "USD") return HKD_PER_USD;
  throw new Error(
    `Неизвестная валюта рекламного аккаунта LinkedIn: ${res.currency}. Добавьте курс конвертации в costToHkdMultiplier.`
  );
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
