import { describe, expect, it } from "vitest";
import type { PlannedQuery } from "./query-planning";
import { muckRockConnector, normalizeCourtListenerResult, normalizeMuckRockRequestResult, normalizeYouTubeVideoItem, searchMuckRockRequests } from "./connectors";

const plannedQuery: PlannedQuery = {
  id: "youtube-1-jury-views-interrogation-video",
  source: "youtube",
  query: "jury views interrogation video",
  intent: "online_primary_media",
  priority: 1,
  expectedEvidence: ["video_metadata"],
  rejectHints: ["reaction"]
};

describe("source connector normalization", () => {
  it("maps YouTube API video metadata into a SourceHit without downloading media", () => {
    const hit = normalizeYouTubeVideoItem(
      {
        id: { videoId: "abc123" },
        snippet: {
          title: "Full police interrogation played in court",
          description: "Raw courtroom footage references recorded interview.",
          channelTitle: "Law&Crime Network",
          publishedAt: "2024-01-02T00:00:00Z",
          thumbnails: { medium: { url: "https://img.example/thumb.jpg" } }
        }
      },
      "query-run-1",
      plannedQuery
    );

    expect(hit.url).toBe("https://www.youtube.com/watch?v=abc123");
    expect(hit.contentType).toBe("video");
    expect(hit.plannedQueryId).toBe(plannedQuery.id);
    expect(hit.plannedQuery).toBe(plannedQuery.query);
    expect(hit.queryIntent).toBe("online_primary_media");
    expect(hit.rawJson).toHaveProperty("snippet");
  });

  it("maps CourtListener search results into docket/document hits", () => {
    const hit = normalizeCourtListenerResult(
      {
        id: 42,
        cluster_id: 100,
        caseName: "United States v. Example",
        court: "ca9",
        absolute_url: "/opinion/42/example/",
        dateFiled: "2023-04-01",
        snippet: "Motion to suppress recorded interview and Miranda statement."
      },
      "query-run-2"
    );

    expect(hit.title).toContain("United States v. Example");
    expect(hit.url).toBe("https://www.courtlistener.com/opinion/42/example/");
    expect(hit.contentType).toBe("docket");
  });

  it("maps MuckRock request results into request hits", () => {
    const hit = normalizeMuckRockRequestResult(
      {
        id: 77,
        title: "",
        requested_docs: "Recorded interview public records request",
        slug: "recorded-interview-77",
        absolute_url: "/foi/example-jurisdiction-1/recorded-interview-77/",
        date_submitted: "2025-02-01",
        status: "done",
        agency: { id: 123, name: "Example Police Department" },
        user: { id: 456, username: "samayd", name: "Samay Dhawan" }
      },
      "query-run-3"
    );

    expect(hit.title).toBe("Recorded interview public records request");
    expect(hit.url).toBe("https://www.muckrock.com/foi/example-jurisdiction-1/recorded-interview-77/");
    expect(hit.authorOrChannel).toBe("Example Police Department | Samay Dhawan");
    expect(hit.description).toContain("Status: done");
    expect(hit.description).toContain("Agency: Example Police Department (123)");
    expect(hit.description).toContain("Requester: Samay Dhawan (456)");
    expect(hit.contentType).toBe("request");
    expect(hit.rawJson).toHaveProperty("agency");
  });

  it("keeps live MuckRock numeric agency and requester references useful", () => {
    const hit = normalizeMuckRockRequestResult(
      {
        id: 88,
        title: "Incident records request",
        requested_docs: "Incident report and recorded interview references",
        slug: "incident-records-request",
        datetime_submitted: "2024-03-01T12:00:00Z",
        status: "done",
        agency: 15225,
        user: 36140
      },
      "query-run-4"
    );

    expect(hit.authorOrChannel).toBe("Agency ID: 15225 | Requester ID: 36140");
    expect(hit.description).toContain("Agency ID: 15225");
    expect(hit.description).toContain("Requester ID: 36140");
    expect(hit.publishedAt).toBe("2024-03-01T12:00:00Z");
  });

  it("authenticates before searching MuckRock requests", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/api/token/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access: "access-token" })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 77,
              title: "Recorded interview request",
              absolute_url: "/foi/example-1/recorded-interview-77/"
            }
          ]
        })
      };
    };

    const hits = await searchMuckRockRequests({
      query: "recorded interview",
      queryRunId: "query-run-3",
      username: "user",
      password: "pass",
      fetchImpl
    });

    expect(calls[0]?.url).toContain("accounts.muckrock.com/api/token");
    expect(calls[1]?.init?.headers).toMatchObject({ Authorization: "Bearer access-token" });
    expect(hits).toHaveLength(1);
  });

  it("enables MuckRock when only MUCKROCK_API_TOKEN is configured", () => {
    expect(muckRockConnector.isEnabled({ MUCKROCK_API_TOKEN: "api-token" })).toBe(true);
  });
});
