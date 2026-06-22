import { describe, expect, it } from "vitest";
import { classifyAccessPath } from "./access-path";

describe("classifyAccessPath", () => {
  it("classifies complete official agency footage as online full", () => {
    expect(
      classifyAccessPath({
        sourceType: "youtube",
        sourceName: "County Sheriff Office",
        availabilityStatus: "online_full",
        isOfficialAgencyUpload: true,
        isTrialArchive: false,
        mentionsDocketExhibit: false,
        mentionsSuppressionMotion: false,
        hasMuckRockFulfillment: false,
        hasEthicalRestriction: false
      })
    ).toBe("online_full");
  });

  it("routes docket-only exhibit references to clerk follow-up", () => {
    expect(
      classifyAccessPath({
        sourceType: "courtlistener",
        sourceName: "CourtListener",
        availabilityStatus: "court_exhibit_reference",
        isOfficialAgencyUpload: false,
        isTrialArchive: false,
        mentionsDocketExhibit: true,
        mentionsSuppressionMotion: false,
        hasMuckRockFulfillment: false,
        hasEthicalRestriction: false
      })
    ).toBe("court_clerk_request");
  });

  it("routes restricted or juvenile material away from access workflows", () => {
    expect(
      classifyAccessPath({
        sourceType: "web",
        sourceName: "Local news",
        availabilityStatus: "unknown",
        isOfficialAgencyUpload: false,
        isTrialArchive: false,
        mentionsDocketExhibit: false,
        mentionsSuppressionMotion: false,
        hasMuckRockFulfillment: false,
        hasEthicalRestriction: true
      })
    ).toBe("sealed_or_restricted");
  });
});

