import { describe, expect, it } from "vitest";
import { validateCandidateClassification } from "./classification-schema";

describe("validateCandidateClassification", () => {
  it("accepts a valid mocked structured output", () => {
    const result = validateCandidateClassification({
      is_primary_footage: true,
      is_reaction_or_commentary: false,
      is_reenactment: false,
      primary_footage_types: ["interrogation"],
      case_identifiers: {
        case_name: "State v. Sample",
        defendant_names: ["Alex Sample"],
        victim_names: [],
        jurisdiction: "Florida",
        agency: "Example County Sheriff Office",
        court_case_number: "CF-2024-1",
        incident_number: "24-1001"
      },
      availability: {
        status: "online_full",
        source_url: "https://example.com/video",
        access_notes: "Official agency upload."
      },
      jcs_fit_rationale: "Full primary footage with clear evidence confrontation.",
      risk_flags: ["none"],
      recommended_next_action: "watch_now",
      confidence: "high"
    });

    expect(result.success).toBe(true);
  });

  it("rejects diagnosis and body-language risk leakage", () => {
    const result = validateCandidateClassification({
      is_primary_footage: false,
      is_reaction_or_commentary: true,
      is_reenactment: false,
      primary_footage_types: ["unknown"],
      case_identifiers: {
        case_name: null,
        defendant_names: [],
        victim_names: [],
        jurisdiction: null,
        agency: null,
        court_case_number: null,
        incident_number: null
      },
      availability: {
        status: "unknown",
        source_url: null,
        access_notes: "Commentary only."
      },
      jcs_fit_rationale: "Host diagnoses the suspect and relies on eye contact.",
      risk_flags: ["diagnosis_claims", "body_language_pseudoscience"],
      recommended_next_action: "reject",
      confidence: "medium"
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("diagnosis_claims");
    expect(result.errors).toContain("body_language_pseudoscience");
  });
});

