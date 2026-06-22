import { describe, expect, it } from "vitest";
import { createMockAiResearchProvider } from "./ai-research-provider";
import { createWorkbenchRepository } from "./repository";

describe("workbench repository", () => {
  it("runs a seeded sweep and ranks useful primary candidates above rejects", async () => {
    const repository = createWorkbenchRepository();

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["seed"]
    });

    const candidates = await repository.listCandidates();

    expect(sweep.resultCount).toBeGreaterThanOrEqual(5);
    expect(candidates[0]?.recommendedNextAction).toBe("watch_now");
    expect(candidates.at(-1)?.recommendedNextAction).toBe("reject");
  });

  it("persists human review decisions without changing source provenance", async () => {
    const repository = createWorkbenchRepository();
    await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["seed"]
    });
    const [candidate] = await repository.listCandidates();

    const reviewed = await repository.reviewCandidate(candidate.id, {
      decision: "request_footage",
      reason: "Need clerk exhibit list before watch queue.",
      reviewer: "samay"
    });

    expect(reviewed.reviewDecision).toBe("request_footage");
    expect(reviewed.provenance[0]?.claimStatus).toBe("directly_supported_by_source");
  });

  it("creates a draft records request and never marks it submitted", async () => {
    const repository = createWorkbenchRepository();
    await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["seed"]
    });
    const caseRecord = (await repository.listCases()).find((item) => item.id === "case-sample-court-exhibit");
    expect(caseRecord).toBeDefined();

    const request = await repository.createRecordsRequestDraft({
      caseId: caseRecord!.id,
      requestType: "court_clerk",
      feeCapDollars: 25
    });

    expect(request.status).toBe("draft");
    expect(request.submittedAt).toBeNull();
    expect(request.requestText).toContain("I am not requesting sealed, juvenile, or restricted material");
  });

  it("reports missing credentials as disabled integrations", () => {
    const repository = createWorkbenchRepository({ env: {} });

    const settings = repository.getSettings();

    expect(settings.integrations.youtube.enabled).toBe(false);
    expect(settings.integrations.youtube.reason).toContain("YOUTUBE_DATA_API_KEY");
    expect(settings.integrations.courtlistener.enabled).toBe(false);
  });

  it("reports MuckRock enabled with an API token only", () => {
    const repository = createWorkbenchRepository({
      env: {
        MUCKROCK_API_TOKEN: "test-token"
      }
    });

    expect(repository.getSettings().integrations.muckrock.enabled).toBe(true);
  });

  it("keeps candidate lists scoped to a single sweep when requested", async () => {
    const repository = createWorkbenchRepository();
    const firstSweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["seed"]
    });
    const secondSweep = await repository.runSweep({
      query: "motion to suppress recorded interview",
      queryFamily: "court_media",
      sources: ["seed"]
    });

    const firstCandidates = await repository.listCandidates({ queryRunId: firstSweep.id });
    const secondCandidates = await repository.listCandidates({ queryRunId: secondSweep.id });
    const allCandidates = await repository.listCandidates();

    expect(firstCandidates).toHaveLength(5);
    expect(secondCandidates).toHaveLength(5);
    expect(allCandidates).toHaveLength(10);
    expect(firstCandidates.every((candidate) => candidate.queryRunId === firstSweep.id)).toBe(true);
    expect(secondCandidates.every((candidate) => candidate.queryRunId === secondSweep.id)).toBe(true);
  });

  it("calls enabled live connectors with planned queries and deduplicates candidate spam", async () => {
    const fetchCalls: string[] = [];
    const fetchImpl = async (url: string) => {
      fetchCalls.push(url);

      if (url.includes("youtube")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: { videoId: "live-youtube-1" },
                snippet: {
                  title: "Full police interrogation played for jury",
                  description: "Recorded suspect interview with trial context.",
                  channelTitle: "Court Archive",
                  publishedAt: "2024-05-01T00:00:00Z"
                }
              }
            ]
          })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 44,
              cluster_id: 4400,
              caseName: "United States v. Live",
              absolute_url: "/opinion/44/live/",
              dateFiled: "2024-04-01",
              snippet: "Motion to suppress recorded interview and Miranda waiver."
            }
          ]
        })
      };
    };
    const repository = createWorkbenchRepository({
      env: {
        YOUTUBE_DATA_API_KEY: "test-youtube-key",
        COURTLISTENER_API_TOKEN: "test-courtlistener-token"
      },
      fetchImpl
    });

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["youtube", "courtlistener"]
    });
    const candidates = await repository.listCandidates();

    expect(sweep.resultCount).toBe(6);
    expect(sweep.queryPlan?.plannedQueries).toHaveLength(6);
    expect(fetchCalls.some((url) => url.includes("googleapis.com/youtube"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("courtlistener.com/api/rest/v4/search"))).toBe(true);
    expect(fetchCalls).toHaveLength(6);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.title)).toContain("Full police interrogation played for jury");
    expect(candidates.map((candidate) => candidate.caseTitle)).toContain("United States v. Live");
    expect(candidates.every((candidate) => candidate.plannedQueryId && candidate.plannedQuery && candidate.queryIntent)).toBe(true);
    expect(candidates.every((candidate) => candidate.scoreStatus === "provisional_metadata")).toBe(true);
    expect(candidates.flatMap((candidate) => candidate.provenance).some((item) => item.claimStatus === "reasonable_inference")).toBe(true);
    expect(candidates.find((candidate) => candidate.sourceType === "courtlistener")?.recommendedNextAction).not.toBe("watch_now");
    expect(candidates.find((candidate) => candidate.sourceType === "youtube")?.recommendedNextAction).toBe("watch_now");
  });

  it("routes MuckRock planned-query hits as records leads and preserves request metadata", async () => {
    const repository = createWorkbenchRepository({
      env: {
        MUCKROCK_API_TOKEN: "test-muckrock-token"
      },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 88,
              title: "Recorded interview public records request",
              requested_docs: "Recorded interview and Miranda waiver materials.",
              absolute_url: "/foi/example-1/recorded-interview-88/",
              status: "done",
              agency: 15225,
              user: 36140
            }
          ]
        })
      })
    });

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["muckrock"]
    });
    const candidates = await repository.listCandidates({ queryRunId: sweep.id });

    expect(sweep.resultCount).toBe(3);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.queryIntent).toBe("public_records_request");
    expect(candidates[0]?.recommendedNextAction).toBe("draft_records_request");
    expect(candidates[0]?.accessPath).toBe("muckrock_existing_request");
    expect(candidates[0]?.scoreStatus).toBe("provisional_metadata");
  });

  it("reports live connector failures instead of silently hiding them", async () => {
    const repository = createWorkbenchRepository({
      env: {
        YOUTUBE_DATA_API_KEY: "test-youtube-key"
      },
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ error: "forbidden" })
      })
    });

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["seed", "youtube"]
    });

    expect(sweep.resultCount).toBe(5);
    expect(sweep.sourceResults).toContainEqual(expect.objectContaining({
      source: "youtube",
      status: "failed",
      resultCount: 0,
      error: expect.stringContaining("YouTube metadata search failed with status 403")
    }));
    expect(sweep.sourceResults).toContainEqual({
      source: "seed",
      status: "succeeded",
      resultCount: 5
    });
  });

  it("keeps successful planned-query hits while surfacing partial source failures", async () => {
    let callCount = 0;
    const repository = createWorkbenchRepository({
      env: {
        YOUTUBE_DATA_API_KEY: "test-youtube-key"
      },
      fetchImpl: async () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            ok: false,
            status: 429,
            json: async () => ({ error: "rate limited" })
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: { videoId: "partial-success-video" },
                snippet: {
                  title: "Full police interrogation played for jury",
                  description: "Recorded suspect interview with trial context.",
                  channelTitle: "Court Archive",
                  publishedAt: "2024-05-01T00:00:00Z"
                }
              }
            ]
          })
        };
      }
    });

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["youtube"]
    });
    const candidates = await repository.listCandidates({ queryRunId: sweep.id });

    expect(sweep.resultCount).toBe(2);
    expect(sweep.error).toBe("One or more sources failed");
    expect(sweep.sourceResults).toContainEqual(expect.objectContaining({
      source: "youtube",
      status: "failed",
      resultCount: 2,
      error: expect.stringContaining("YouTube metadata search failed with status 429")
    }));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.title).toBe("Full police interrogation played for jury");
  });

  it("does not fail live sweeps when AI assistance is disabled", async () => {
    const repository = createWorkbenchRepository({
      env: {
        YOUTUBE_DATA_API_KEY: "test-youtube-key"
      },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: { videoId: "ai-disabled-video" },
              snippet: {
                title: "Full police interrogation played for jury",
                description: "Recorded suspect interview with trial context.",
                channelTitle: "Court Archive",
                publishedAt: "2024-05-01T00:00:00Z"
              }
            }
          ]
        })
      })
    });

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["youtube"]
    });
    const candidates = await repository.listCandidates({ queryRunId: sweep.id });
    const claims = await repository.listCaseEvidenceClaims(candidates[0]!.caseId);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.scoreStatus).toBe("provisional_metadata");
    expect(claims).toHaveLength(0);
    expect(repository.getSettings().ai.enabled).toBe(false);
  });

  it("runs mock AI extraction for live hits without changing metadata truth status", async () => {
    const repository = createWorkbenchRepository({
      env: {
        YOUTUBE_DATA_API_KEY: "test-youtube-key"
      },
      aiProvider: createMockAiResearchProvider(),
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: { videoId: "ai-extraction-video" },
              snippet: {
                title: "David Creato Trial Jury Requests to Review Police Interrogation",
                description: "Trial coverage references a recorded police interrogation.",
                channelTitle: "Court Archive",
                publishedAt: "2024-05-01T00:00:00Z"
              }
            }
          ]
        })
      })
    });

    const sweep = await repository.runSweep({
      query: "jury views interrogation video",
      queryFamily: "court_media",
      sources: ["youtube"]
    });
    const candidates = await repository.listCandidates({ queryRunId: sweep.id });
    const claims = await repository.listCaseEvidenceClaims(candidates[0]!.caseId);

    expect(candidates[0]?.scoreStatus).toBe("provisional_metadata");
    expect(claims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: "AI extraction identified a source-packet research lead from metadata.",
        claimStatus: "reasonable_inference",
        provenance: [{ sourceHitId: candidates[0]!.sourceHitId, field: "title" }]
      })
    ]));
  });
});
