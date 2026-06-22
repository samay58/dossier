import { describe, expect, it } from "vitest";
import { validateExtractedSourcePacket } from "./ai-research";

describe("AI research schemas", () => {
  it("accepts source-packet extraction with claim provenance", () => {
    const result = validateExtractedSourcePacket({
      people: [{ name: "David Creato", role: "defendant", provenance: [{ sourceHitId: "hit-1", field: "title" }] }],
      caseCaption: { value: "State v. David Creato", provenance: [{ sourceHitId: "hit-1", field: "title" }] },
      jurisdiction: null,
      courtOrAgency: null,
      docketNumber: null,
      caseNumber: null,
      eventDate: null,
      claims: [
        {
          type: "online_media_reference",
          text: "Title references a police interrogation reviewed at trial.",
          status: "reasonable_inference",
          provenance: [{ sourceHitId: "hit-1", field: "title" }]
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects claims without provenance", () => {
    const result = validateExtractedSourcePacket({
      people: [],
      caseCaption: null,
      jurisdiction: null,
      courtOrAgency: null,
      docketNumber: null,
      caseNumber: null,
      eventDate: null,
      claims: [
        {
          type: "online_media_reference",
          text: "Footage exists.",
          status: "reasonable_inference",
          provenance: []
        }
      ]
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected validation to fail");
    expect(result.errors).toContain("claims[0].provenance must contain at least one source reference");
  });

  it("rejects AI direct support claims because direct support belongs to source parsing", () => {
    const result = validateExtractedSourcePacket({
      people: [],
      caseCaption: null,
      jurisdiction: null,
      courtOrAgency: null,
      docketNumber: null,
      caseNumber: null,
      eventDate: null,
      claims: [
        {
          type: "online_media_reference",
          text: "The title says interrogation video.",
          status: "directly_supported_by_source",
          provenance: [{ sourceHitId: "hit-1", field: "title" }]
        }
      ]
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected validation to fail");
    expect(result.errors).toContain("AI extraction cannot emit directly_supported_by_source claims");
  });
});
