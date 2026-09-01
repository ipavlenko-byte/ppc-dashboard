import { upsertDailyRows, writeFullReplace } from "@/lib/linkedinSheetsWrite";
import { HKD_PER_USD } from "@/lib/format";

export const dynamic = "force-dynamic";
// Синк теперь делает несколько последовательных batch-запросов (аналитика ×2,
// кампании/группы/креативы/таргетинг) — дефолтный лимит serverless-функции
// (10с на Vercel Hobby) может не хватить.
export const maxDuration = 60;

// LinkedIn требует версионировать запросы к /rest/* через этот заголовок (формат YYYYMM).
// Версии "гаснут" примерно через год — если начнёт возвращать 426 NONEXISTENT_VERSION,
// обновить на более свежий месяц.
const LINKEDIN_VERSION = "202601";
const LOOKBACK_DAYS = 3; // конверсии дозревают, перезаписываем последние дни
const MAX_HISTORY_DAYS = 240;
const BATCH_SIZE = 50; // с запасом ниже практических лимитов длины URL/Rest.li batch

const FACET_LABELS: Record<string, string> = {
  industries: "Индустрии",
  titles: "Должности",
  locations: "Гео",
  profileLocations: "Гео",
  staffCountRanges: "Размер компании",
  skills: "Навыки",
  interfaceLocales: "Язык интерфейса",
  seniorities: "Уровень должности",
  jobFunctions: "Функции",
  degrees: "Образование",
  fieldsOfStudy: "Специальность",
};

interface AnalyticsPoint {
  date: string;
  id: string; // последний сегмент pivot URN (campaign id или creative id)
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

interface LinkedInAnalyticsElement {
  pivotValues?: string[];
  dateRange?: { start: { year: number; month: number; day: number } };
  impressions?: number;
  clicks?: number;
  costInLocalCurrency?: string;
  externalWebsiteConversions?: number;
}

interface LinkedInCampaign {
  id: number;
  name: string;
  status?: string;
  campaignGroup?: string; // "urn:li:sponsoredCampaignGroup:ID"
  targetingCriteria?: {
    include?: { and?: { or?: Record<string, string[]> }[] };
  };
}

interface LinkedInCreative {
  id: string; // "urn:li:sponsoredCreative:ID"
  name?: string;
  campaign?: string; // "urn:li:sponsoredCampaign:ID"
}

interface BatchGetResponse<T> {
  results: Record<string, T>;
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
    const costToHkd = await costToHkdMultiplier(accessToken, adAccountId);

    const [campaignPoints, creativePoints] = await Promise.all([
      fetchAnalytics(accessToken, adAccountId, from, to, "CAMPAIGN"),
      fetchAnalytics(accessToken, adAccountId, from, to, "CREATIVE"),
    ]);

    const campaigns = await batchFetchCampaigns(
      accessToken,
      adAccountId,
      new Set(campaignPoints.map((p) => p.id))
    );
    const creatives = await batchFetchCreatives(accessToken, adAccountId, new Set(creativePoints.map((p) => p.id)));

    // Креатив может принадлежать кампании, не попавшей в CAMPAIGN-пивот за это
    // окно (редко, но возможно) — доберём такие кампании отдельно.
    const missingCampaignIds = new Set<string>();
    for (const c of creatives.values()) {
      const id = c.campaign?.split(":").pop();
      if (id && !campaigns.has(id)) missingCampaignIds.add(id);
    }
    if (missingCampaignIds.size > 0) {
      const extra = await batchFetchCampaigns(accessToken, adAccountId, missingCampaignIds);
      extra.forEach((v, k) => campaigns.set(k, v));
    }

    const groupIds = new Set(
      Array.from(campaigns.values())
        .map((c) => c.campaignGroup?.split(":").pop())
        .filter((id): id is string => Boolean(id))
    );
    const groups = await batchFetchCampaignGroups(accessToken, adAccountId, groupIds);

    const campaignName = (id: string) => campaigns.get(id)?.name ?? `Unknown campaign (${id})`;
    const groupName = (id: string) => {
      const groupId = campaigns.get(id)?.campaignGroup?.split(":").pop();
      return groupId ? groups.get(groupId) ?? `Unknown group (${groupId})` : "";
    };

    const adsRows = campaignPoints.map((p) => [
      p.date,
      campaignName(p.id),
      groupName(p.id),
      p.impressions,
      p.clicks,
      p.cost * costToHkd,
      p.conversions,
    ]);

    const creativeRows = creativePoints.map((p) => {
      const creative = creatives.get(p.id);
      const campaignId = creative?.campaign?.split(":").pop();
      const creativeName = creative?.name || `Creative #${p.id}`;
      return [
        p.date,
        campaignId ? campaignName(campaignId) : "Unknown campaign",
        creativeName,
        p.impressions,
        p.clicks,
        p.cost * costToHkd,
        p.conversions,
      ];
    });

    const groupRows = Array.from(groups.entries()).map(([id, name]) => [id, name]);
    const targetingRows = await buildTargetingRows(accessToken, campaigns, campaignName);

    const [adsResult, creativesResult] = await Promise.all([
      upsertDailyRows(
        "linkedin_ads_daily",
        ["date", "campaign", "campaignGroup", "impressions", "clicks", "cost", "conversions"],
        adsRows,
        MAX_HISTORY_DAYS
      ),
      upsertDailyRows(
        "linkedin_creatives_daily",
        ["date", "campaign", "creative", "impressions", "clicks", "cost", "conversions"],
        creativeRows,
        MAX_HISTORY_DAYS
      ),
    ]);

    const [groupsResult, targetingResult] = await Promise.all([
      writeFullReplace("linkedin_campaign_groups", ["id", "name"], groupRows),
      writeFullReplace("linkedin_targeting", ["campaign", "facetType", "value"], targetingRows),
    ]);

    return Response.json({
      ok: true,
      ads: adsResult.written,
      creatives: creativesResult.written,
      groups: groupsResult.written,
      targeting: targetingResult.written,
    });
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

function* chunks<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

async function fetchAnalytics(
  accessToken: string,
  adAccountId: string,
  from: Date,
  to: Date,
  pivot: "CAMPAIGN" | "CREATIVE"
): Promise<AnalyticsPoint[]> {
  // LinkedIn's Rest.li "reduced" query syntax wants the structural characters
  // (parens/colons/commas) literal in the URL, not percent-encoded — wrapping
  // this in encodeURIComponent() (as URLSearchParams would) breaks parsing and
  // returns a generic 400. Only the URN's colons are escaped, matching what
  // LinkedIn's own docs/examples show.
  const dateRange = `(start:${dateParam(from)},end:${dateParam(to)})`;
  const fields = "dateRange,pivotValues,impressions,clicks,costInLocalCurrency,externalWebsiteConversions";
  const url =
    `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=${pivot}&timeGranularity=DAILY` +
    `&dateRange=${dateRange}` +
    `&accounts=List(urn%3Ali%3AsponsoredAccount%3A${adAccountId})` +
    `&fields=${fields}`;

  const res = await linkedInGet<{ elements: LinkedInAnalyticsElement[] }>(url, accessToken);
  return (res.elements ?? []).flatMap((el) => {
    const urn = el.pivotValues?.[0];
    const id = urn?.split(":").pop();
    const d = el.dateRange?.start;
    if (!id || !d) return [];
    return [
      {
        date: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`,
        id,
        impressions: Number(el.impressions ?? 0),
        clicks: Number(el.clicks ?? 0),
        cost: Number(el.costInLocalCurrency ?? 0),
        conversions: Number(el.externalWebsiteConversions ?? 0),
      },
    ];
  });
}

async function batchFetchCampaigns(
  accessToken: string,
  adAccountId: string,
  ids: Set<string>
): Promise<Map<string, LinkedInCampaign>> {
  const map = new Map<string, LinkedInCampaign>();
  if (ids.size === 0) return map;
  for (const chunk of chunks(Array.from(ids), BATCH_SIZE)) {
    const url = `https://api.linkedin.com/rest/adAccounts/${adAccountId}/adCampaigns?ids=List(${chunk.join(",")})`;
    const res = await linkedInGet<BatchGetResponse<LinkedInCampaign>>(url, accessToken);
    for (const [id, c] of Object.entries(res.results ?? {})) map.set(id, c);
  }
  return map;
}

async function batchFetchCampaignGroups(
  accessToken: string,
  adAccountId: string,
  ids: Set<string>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.size === 0) return map;
  for (const chunk of chunks(Array.from(ids), BATCH_SIZE)) {
    const url = `https://api.linkedin.com/rest/adAccounts/${adAccountId}/adCampaignGroups?ids=List(${chunk.join(",")})`;
    const res = await linkedInGet<BatchGetResponse<{ id: number; name: string }>>(url, accessToken);
    for (const [id, g] of Object.entries(res.results ?? {})) map.set(id, g.name);
  }
  return map;
}

async function batchFetchCreatives(
  accessToken: string,
  adAccountId: string,
  ids: Set<string>
): Promise<Map<string, LinkedInCreative>> {
  const map = new Map<string, LinkedInCreative>();
  if (ids.size === 0) return map;
  for (const chunk of chunks(Array.from(ids), BATCH_SIZE)) {
    const urnList = chunk.map((id) => `urn%3Ali%3AsponsoredCreative%3A${id}`).join(",");
    const url = `https://api.linkedin.com/rest/adAccounts/${adAccountId}/creatives?ids=List(${urnList})`;
    const res = await linkedInGet<BatchGetResponse<LinkedInCreative>>(url, accessToken);
    for (const [urn, c] of Object.entries(res.results ?? {})) {
      const id = urn.split(":").pop();
      if (id) map.set(id, c);
    }
  }
  return map;
}

// Таргетинг — только для активных кампаний, попавших в текущее окно аналитики
// (не тянем сотни архивных кампаний ради описания их старого таргетинга).
async function buildTargetingRows(
  accessToken: string,
  campaigns: Map<string, LinkedInCampaign>,
  campaignName: (id: string) => string
): Promise<string[][]> {
  const activeCampaigns = Array.from(campaigns.entries()).filter(([, c]) => c.status === "ACTIVE");

  const urns = new Set<string>();
  for (const [, c] of activeCampaigns) {
    for (const group of c.targetingCriteria?.include?.and ?? []) {
      for (const list of Object.values(group.or ?? {})) {
        for (const urn of list) urns.add(urn);
      }
    }
  }
  if (urns.size === 0) return [];

  const names = await batchResolveTargetingEntities(accessToken, Array.from(urns));

  const rows: string[][] = [];
  for (const [id, c] of activeCampaigns) {
    for (const group of c.targetingCriteria?.include?.and ?? []) {
      for (const [facetUrn, urnList] of Object.entries(group.or ?? {})) {
        const facetKey = facetUrn.split(":").pop() ?? facetUrn;
        const label = FACET_LABELS[facetKey] ?? facetKey;
        for (const urn of urnList) {
          rows.push([campaignName(id), label, names.get(urn) ?? urn]);
        }
      }
    }
  }
  return rows;
}

async function batchResolveTargetingEntities(accessToken: string, urns: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const chunk of chunks(urns, BATCH_SIZE)) {
    // В отличие от adAnalytics (которому нужны литеральные ":" в dateRange/accounts),
    // adTargetingEntities требует percent-encoded двоеточия внутри самих URN — иначе 400
    // ILLEGAL_ARGUMENT без указания, какой именно параметр не понравился.
    const urnList = chunk.map((u) => u.replace(/:/g, "%3A")).join(",");
    const url = `https://api.linkedin.com/rest/adTargetingEntities?q=urns&urns=List(${urnList})`;
    const res = await linkedInGet<{ elements: { urn: string; name: string; facetUrn: string }[] }>(url, accessToken);
    for (const el of res.elements ?? []) {
      // Один urn резолвится сразу под несколько facetUrn (titles/titlesPast/titlesAll) —
      // имя от этого не меняется, берём первое попавшееся.
      if (!map.has(el.urn)) map.set(el.urn, el.name);
    }
  }
  return map;
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
