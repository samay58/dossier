import { describe, expect, it } from "vitest";
import { generateRecordsRequestDraft } from "./records-request";

describe("generateRecordsRequestDraft", () => {
  it("drafts a narrow agency request without submitting it", () => {
    const draft = generateRecordsRequestDraft({
      requestType: "state_public_records",
      caseName: "State v. Sample",
      defendantName: "Alex Sample",
      agencyName: "Example County Sheriff Office",
      agencyJurisdiction: "Example County, Florida",
      incidentNumber: "24-1001",
      caseNumber: "CF-2024-1",
      feeCapDollars: 50
    });

    expect(draft.status).toBe("draft");
    expect(draft.subject).toContain("Recorded Suspect Interview Materials");
    expect(draft.body).toContain("electronic copies");
    expect(draft.body).toContain("Please notify me before fees exceed $50");
    expect(draft.riskNotes).toContain("Human approval is required before submission.");
  });

  it("keeps court clerk requests scoped to public exhibit procedures", () => {
    const draft = generateRecordsRequestDraft({
      requestType: "court_clerk",
      caseName: "United States v. Example",
      defendantName: "Jordan Example",
      courtName: "District Court",
      caseNumber: "1:24-cr-10",
      feeCapDollars: 25
    });

    expect(draft.body).toContain("I am not requesting sealed, juvenile, or restricted material");
    expect(draft.body).toContain("procedure for requesting a copy");
  });
});

