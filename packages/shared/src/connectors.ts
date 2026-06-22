import type { SourceHit, SourceType } from "./types";
import type { PlannedQuery } from "./query-planning";

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type SourceConnector = {
  id: string;
  name: string;
  sourceType: SourceType;
  isEnabled: (env: Record<string, string | undefined>) => boolean;
  search: (input: { query: string; queryRunId: string; env: Record<string, string | undefined>; fetchImpl?: FetchLike; plannedQuery?: PlannedQuery }) => Promise<SourceHit[]>;
};

function nowIso() {
  return new Date().toISOString();
}

function maybeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function maybeScalarString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return maybeString(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const stringValue = maybeScalarString(value);
    if (stringValue) return stringValue;
  }
  return null;
}

function nestedString(value: unknown, ...keys: string[]): string | null {
  const record = objectValue(value);
  return firstString(...keys.map((key) => record[key]));
}

function scopedId(prefix: string, queryRunId: string, externalId: string, plannedQuery?: PlannedQuery): string {
  return `${prefix}-${queryRunId}-${plannedQuery?.id ?? "direct"}-${externalId}`.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function queryOrigin(plannedQuery?: PlannedQuery) {
  return {
    plannedQueryId: plannedQuery?.id ?? null,
    plannedQuery: plannedQuery?.query ?? null,
    queryIntent: plannedQuery?.intent ?? null
  };
}

export function normalizeYouTubeVideoItem(item: unknown, queryRunId: string, plannedQuery?: PlannedQuery): SourceHit {
  const record = objectValue(item);
  const id = objectValue(record.id);
  const snippet = objectValue(record.snippet);
  const videoId = maybeString(id.videoId) ?? maybeString(record.videoId) ?? "unknown-video";

  return {
    id: scopedId("hit-youtube", queryRunId, videoId, plannedQuery),
    sourceId: "source-youtube",
    queryRunId,
    ...queryOrigin(plannedQuery),
    sourceType: "youtube",
    sourceName: "YouTube Data API",
    externalId: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: maybeString(snippet.title) ?? "Untitled YouTube video",
    description: maybeString(snippet.description),
    publishedAt: maybeString(snippet.publishedAt),
    authorOrChannel: maybeString(snippet.channelTitle),
    rawJson: record,
    contentType: "video",
    ingestedAt: nowIso()
  };
}

export function normalizeCourtListenerResult(item: unknown, queryRunId: string, plannedQuery?: PlannedQuery): SourceHit {
  const record = objectValue(item);
  const path = maybeString(record.absolute_url) ?? maybeString(record.url) ?? "";
  const url = path.startsWith("http") ? path : `https://www.courtlistener.com${path}`;
  const externalId = String(record.cluster_id ?? record.id ?? url);
  const title = maybeString(record.caseName) ?? maybeString(record.caseNameFull) ?? maybeString(record.case_name) ?? "CourtListener result";

  return {
    id: scopedId("hit-courtlistener", queryRunId, externalId, plannedQuery),
    sourceId: "source-courtlistener",
    queryRunId,
    ...queryOrigin(plannedQuery),
    sourceType: "courtlistener",
    sourceName: "CourtListener RECAP",
    externalId,
    url,
    title,
    description: maybeString(record.snippet) ?? maybeString(record.description),
    publishedAt: maybeString(record.dateFiled) ?? maybeString(record.date_filed),
    authorOrChannel: maybeString(record.court),
    rawJson: record,
    contentType: "docket",
    ingestedAt: nowIso()
  };
}

export function normalizeMuckRockRequestResult(item: unknown, queryRunId: string, plannedQuery?: PlannedQuery): SourceHit {
  const record = objectValue(item);
  const externalId = String(record.id ?? maybeString(record.slug) ?? "unknown-request");
  const agencyName = firstString(
    maybeString(record.agency),
    nestedString(record.agency, "name", "title", "slug")
  );
  const agencyId = firstString(nestedString(record.agency, "id", "pk"), record.agency_id, record.agency);
  const requesterName = firstString(
    maybeString(record.user),
    nestedString(record.user, "name", "full_name", "username", "email")
  );
  const requesterId = firstString(nestedString(record.user, "id", "pk"), record.user_id, record.user);
  const status = firstString(record.status, record.status_name);
  const path = firstString(
    record.absolute_url,
    record.web_url,
    record.public_url,
    record.canonical_url,
    record.url,
    record.resource_uri
  );
  const url = path
    ? path.startsWith("http") ? path : `https://www.muckrock.com${path}`
    : `https://www.muckrock.com/api_v2/requests/${externalId}/?format=json`;
  const requestedDocs = maybeString(record.requested_docs);
  const title =
    maybeString(record.title) ??
    maybeString(record.name) ??
    (requestedDocs ? requestedDocs.split("\n")[0]?.slice(0, 140) || null : null) ??
    maybeString(record.slug)?.replaceAll("-", " ") ??
    "MuckRock request";
  const descriptionParts = [
    status ? `Status: ${status}` : null,
    agencyName ? `Agency: ${agencyName}${agencyId ? ` (${agencyId})` : ""}` : agencyId ? `Agency ID: ${agencyId}` : null,
    requesterName ? `Requester: ${requesterName}${requesterId ? ` (${requesterId})` : ""}` : requesterId ? `Requester ID: ${requesterId}` : null,
    maybeString(record.description),
    requestedDocs
  ].filter(Boolean);
  const authorParts = [
    agencyName ?? (agencyId ? `Agency ID: ${agencyId}` : null),
    requesterName ?? (requesterId ? `Requester ID: ${requesterId}` : null)
  ].filter(Boolean);

  return {
    id: scopedId("hit-muckrock", queryRunId, externalId, plannedQuery),
    sourceId: "source-muckrock",
    queryRunId,
    ...queryOrigin(plannedQuery),
    sourceType: "muckrock",
    sourceName: "MuckRock",
    externalId,
    url,
    title,
    description: descriptionParts.join("\n") || null,
    publishedAt: firstString(record.date_submitted, record.datetime_submitted, record.datetime_done, record.date_created, record.datetime_updated),
    authorOrChannel: authorParts.join(" | ") || null,
    rawJson: record,
    contentType: "request",
    ingestedAt: nowIso()
  };
}

export async function searchYouTubeMetadata(input: {
  query: string;
  queryRunId: string;
  apiKey?: string;
  maxResults?: number;
  fetchImpl?: FetchLike;
  plannedQuery?: PlannedQuery;
}): Promise<SourceHit[]> {
  if (!input.apiKey) {
    return [];
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("q", input.query);
  url.searchParams.set("maxResults", String(input.maxResults ?? 10));
  url.searchParams.set("key", input.apiKey);

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube metadata search failed with status ${response.status}`);
  }

  const body = objectValue(await response.json());
  const items = Array.isArray(body.items) ? body.items : [];
  return items
    .filter((item) => maybeString(objectValue(objectValue(item).id).videoId))
    .map((item) => normalizeYouTubeVideoItem(item, input.queryRunId, input.plannedQuery));
}

export async function searchCourtListener(input: {
  query: string;
  queryRunId: string;
  token?: string;
  fetchImpl?: FetchLike;
  plannedQuery?: PlannedQuery;
}): Promise<SourceHit[]> {
  if (!input.token) {
    return [];
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL("https://www.courtlistener.com/api/rest/v4/search/");
  url.searchParams.set("q", input.query);

  const response = await fetchImpl(url.toString(), {
    headers: {
      Authorization: `Token ${input.token}`
    }
  });

  if (!response.ok) {
    throw new Error(`CourtListener search failed with status ${response.status}`);
  }

  const body = objectValue(await response.json());
  const results = Array.isArray(body.results) ? body.results : [];
  return results.map((item) => normalizeCourtListenerResult(item, input.queryRunId, input.plannedQuery));
}

async function getMuckRockAccessToken(input: {
  username?: string;
  password?: string;
  fetchImpl: FetchLike;
}): Promise<string | null> {
  if (!input.username || !input.password) {
    return null;
  }

  const jsonResponse = await input.fetchImpl("https://accounts.muckrock.com/api/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      username: input.username,
      password: input.password
    })
  });

  if (jsonResponse.ok) {
    const body = objectValue(await jsonResponse.json());
    return maybeString(body.access);
  }

  const formResponse = await input.fetchImpl("https://accounts.muckrock.com/api/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      username: input.username,
      password: input.password
    }).toString()
  });

  if (!formResponse.ok) {
    throw new Error(`MuckRock token request failed with status ${formResponse.status}`);
  }

  const body = objectValue(await formResponse.json());
  return maybeString(body.access);
}

export async function searchMuckRockRequests(input: {
  query: string;
  queryRunId: string;
  username?: string;
  password?: string;
  accessToken?: string;
  fetchImpl?: FetchLike;
  plannedQuery?: PlannedQuery;
}): Promise<SourceHit[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const accessToken = input.accessToken ?? await getMuckRockAccessToken({
    username: input.username,
    password: input.password,
    fetchImpl
  });

  if (!accessToken) {
    return [];
  }

  const url = new URL("https://www.muckrock.com/api_v2/requests/");
  url.searchParams.set("format", "json");
  url.searchParams.set("page_size", "10");
  url.searchParams.set("q", input.query);

  const response = await fetchImpl(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`MuckRock request search failed with status ${response.status}`);
  }

  const body = objectValue(await response.json());
  const results = Array.isArray(body.results) ? body.results : Array.isArray(body.objects) ? body.objects : [];
  return results.map((item) => normalizeMuckRockRequestResult(item, input.queryRunId, input.plannedQuery));
}

export const youtubeConnector: SourceConnector = {
  id: "youtube",
  name: "YouTube Data API",
  sourceType: "youtube",
  isEnabled: (env) => Boolean(env.YOUTUBE_DATA_API_KEY),
  search: ({ query, queryRunId, env, fetchImpl, plannedQuery }) =>
    searchYouTubeMetadata({ query, queryRunId, apiKey: env.YOUTUBE_DATA_API_KEY, fetchImpl, plannedQuery })
};

export const courtListenerConnector: SourceConnector = {
  id: "courtlistener",
  name: "CourtListener RECAP",
  sourceType: "courtlistener",
  isEnabled: (env) => Boolean(env.COURTLISTENER_API_TOKEN),
  search: ({ query, queryRunId, env, fetchImpl, plannedQuery }) =>
    searchCourtListener({ query, queryRunId, token: env.COURTLISTENER_API_TOKEN, fetchImpl, plannedQuery })
};

export const muckRockConnector: SourceConnector = {
  id: "muckrock",
  name: "MuckRock",
  sourceType: "muckrock",
  isEnabled: (env) => Boolean(env.MUCKROCK_ACCESS_TOKEN || env.MUCKROCK_API_TOKEN || (env.MUCKROCK_USERNAME && env.MUCKROCK_PASSWORD)),
  search: ({ query, queryRunId, env, fetchImpl, plannedQuery }) =>
    searchMuckRockRequests({
      query,
      queryRunId,
      username: env.MUCKROCK_USERNAME,
      password: env.MUCKROCK_PASSWORD,
      accessToken: env.MUCKROCK_ACCESS_TOKEN ?? env.MUCKROCK_API_TOKEN,
      fetchImpl,
      plannedQuery
    })
};

export const disabledSeedBackedConnectors: SourceConnector[] = [
  {
    id: "documentcloud",
    name: "DocumentCloud",
    sourceType: "documentcloud",
    isEnabled: (env) => Boolean(env.DOCUMENTCLOUD_USERNAME && env.DOCUMENTCLOUD_PASSWORD),
    search: async () => []
  }
];
