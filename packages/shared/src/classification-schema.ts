const PRIMARY_FOOTAGE_TYPES = new Set([
  "interrogation",
  "suspect_interview",
  "confession",
  "trial",
  "bodycam",
  "dashcam",
  "audio_911",
  "surveillance",
  "jail_call",
  "unknown"
]);

const AVAILABILITY_STATUSES = new Set([
  "online_full",
  "online_partial",
  "court_exhibit_reference",
  "document_reference_only",
  "needs_public_records_request",
  "unknown"
]);

const RISK_FLAGS = new Set([
  "minor",
  "active_case",
  "sealed_or_restricted",
  "graphic_content",
  "privacy_sensitive",
  "copyright_unclear",
  "low_provenance",
  "body_language_pseudoscience",
  "diagnosis_claims",
  "none"
]);

const RECOMMENDED_ACTIONS = new Set([
  "watch_now",
  "research_case",
  "find_docket",
  "find_transcript",
  "draft_records_request",
  "reject",
  "human_review"
]);

const CONFIDENCE_VALUES = new Set(["low", "medium", "high"]);

export type CandidateClassificationValidation = {
  success: boolean;
  errors: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateCandidateClassification(value: unknown): CandidateClassificationValidation {
  const errors: string[] = [];

  if (!isObject(value)) {
    return { success: false, errors: ["classification must be an object"] };
  }

  for (const field of ["is_primary_footage", "is_reaction_or_commentary", "is_reenactment"]) {
    if (typeof value[field] !== "boolean") {
      errors.push(`${field} must be boolean`);
    }
  }

  if (!Array.isArray(value.primary_footage_types)) {
    errors.push("primary_footage_types must be an array");
  } else {
    for (const footageType of value.primary_footage_types) {
      if (typeof footageType !== "string" || !PRIMARY_FOOTAGE_TYPES.has(footageType)) {
        errors.push(`invalid primary footage type: ${String(footageType)}`);
      }
    }
  }

  if (!isObject(value.case_identifiers)) {
    errors.push("case_identifiers must be an object");
  } else {
    if (!isStringArray(value.case_identifiers.defendant_names)) {
      errors.push("defendant_names must be an array of strings");
    }
    if (!isStringArray(value.case_identifiers.victim_names)) {
      errors.push("victim_names must be an array of strings");
    }
  }

  if (!isObject(value.availability)) {
    errors.push("availability must be an object");
  } else if (typeof value.availability.status !== "string" || !AVAILABILITY_STATUSES.has(value.availability.status)) {
    errors.push("availability.status is invalid");
  }

  if (typeof value.jcs_fit_rationale !== "string") {
    errors.push("jcs_fit_rationale must be a string");
  }

  if (!Array.isArray(value.risk_flags)) {
    errors.push("risk_flags must be an array");
  } else {
    for (const flag of value.risk_flags) {
      if (typeof flag !== "string" || !RISK_FLAGS.has(flag)) {
        errors.push(`invalid risk flag: ${String(flag)}`);
      }
    }
    if (value.risk_flags.includes("diagnosis_claims")) {
      errors.push("diagnosis_claims");
    }
    if (value.risk_flags.includes("body_language_pseudoscience")) {
      errors.push("body_language_pseudoscience");
    }
  }

  if (typeof value.recommended_next_action !== "string" || !RECOMMENDED_ACTIONS.has(value.recommended_next_action)) {
    errors.push("recommended_next_action is invalid");
  }

  if (typeof value.confidence !== "string" || !CONFIDENCE_VALUES.has(value.confidence)) {
    errors.push("confidence is invalid");
  }

  return { success: errors.length === 0, errors };
}
