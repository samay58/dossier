import { describe, expect, it } from "vitest";
import type { SourceHit } from "@interrogation/shared";
import { createAiResearchProvider, createDisabledAiResearchProvider, createMockAiResearchProvider, createOpenAiResearchProvider } from "./ai-research-provider";

const sourceHit: SourceHit = {
  id: "hit-1",
  sourceId: "source-youtube",
  queryRunId: "run-1",
  plannedQueryId: "youtube-1",
  plannedQuery: "jury views interrogation video",
  queryIntent: "online_primary_media",
  sourceType: "youtube",
  sourceName: "YouTube Data API",
  externalId: "abc123",
  url: "https://www.youtube.com/watch?v=abc123",
  title: "David Creato Trial Jury Requests to Review Police Interrogation",
  description: "Trial coverage references a recorded police interrogation.",
  publishedAt: "2024-01-01T00:00:00.000Z",
  authorOrChannel: "Court Archive",
  rawJson: { snippet: { title: "David Creato Trial Jury Requests to Review Police Interrogation" } },
  contentType: "video",
  ingestedAt: "2026-06-22T00:00:00.000Z"
};

describe("AI research provider", () => {
  it("mock provider extracts source-packet claims with provenance", async () => {
    const provider = createMockAiResearchProvider();
    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("succeeded");
    expect(result.provider).toBe("mock");
    expect(result.output.people[0]?.name).toBe("David Creato");
    expect(result.output.claims[0]?.provenance[0]).toEqual({ sourceHitId: "hit-1", field: "title" });
  });

  it("disabled provider returns skipped output without failing sweeps", async () => {
    const provider = createDisabledAiResearchProvider("OPENAI_API_KEY is not configured.");
    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("skipped");
    expect(result.output.claims).toHaveLength(0);
  });

  it("factory returns disabled provider when no key is configured", async () => {
    const provider = createAiResearchProvider({ env: {} });
    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("skipped");
  });

  it("OpenAI provider validates structured output before returning it", async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          people: [{ name: "David Creato", role: null, provenance: [{ sourceHitId: "hit-1", field: "title" }] }],
          caseCaption: null,
          jurisdiction: null,
          courtOrAgency: { value: "Court Archive", provenance: [{ sourceHitId: "hit-1", field: "authorOrChannel" }] },
          docketNumber: null,
          caseNumber: null,
          eventDate: null,
          claims: [
            {
              type: "online_media_reference",
              text: "Metadata references trial review of a recorded interrogation.",
              status: "reasonable_inference",
              provenance: [{ sourceHitId: "hit-1", field: "title" }]
            }
          ]
        })
      })
    });
    const provider = createOpenAiResearchProvider({ apiKey: "test-key", model: "test-model", fetchImpl });

    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("succeeded");
    expect(result.provider).toBe("openai");
    expect(result.output.claims[0]?.status).toBe("reasonable_inference");
  });
});
