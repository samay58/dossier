import type { ClaimStatus } from "./types";

export type AiTaskType =
  | "source_packet_extraction"
  | "case_cluster_suggestion"
  | "query_plan_suggestion"
  | "dossier_explanation"
  | "records_draft_refinement";

export type AiExtractionStatus = "succeeded" | "failed" | "skipped";

export type AiResearchProviderName = "mock" | "openai" | "disabled";

export type EvidenceClaimType =
  | "online_media_reference"
  | "court_recording_reference"
  | "public_records_path"
  | "commentary_or_recap"
  | "ethical_restriction";

export type SourceFieldReference = {
  sourceHitId: string;
  field: string;
};

export type ExtractedValue<T> = {
  value: T;
  provenance: SourceFieldReference[];
};

export type ExtractedPerson = {
  name: string;
  role: string | null;
  provenance: SourceFieldReference[];
};

export type AiClaimStatus = Exclude<ClaimStatus, "directly_supported_by_source">;

export type EvidenceClaim = {
  type: EvidenceClaimType;
  text: string;
  status: AiClaimStatus;
  provenance: SourceFieldReference[];
};

export type ExtractedSourcePacket = {
  people: ExtractedPerson[];
  caseCaption: ExtractedValue<string> | null;
  jurisdiction: ExtractedValue<string> | null;
  courtOrAgency: ExtractedValue<string> | null;
  docketNumber: ExtractedValue<string> | null;
  caseNumber: ExtractedValue<string> | null;
  eventDate: ExtractedValue<string> | null;
  claims: EvidenceClaim[];
};

export type AiExtractionResult = {
  taskType: "source_packet_extraction";
  status: AiExtractionStatus;
  provider: AiResearchProviderName;
  model: string | null;
  output: ExtractedSourcePacket;
  error: string | null;
};

export type AiRunRecord = {
  id: string;
  queryRunId: string;
  sourceHitId: string;
  taskType: AiTaskType;
  provider: AiResearchProviderName;
  model: string | null;
  status: AiExtractionStatus;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  error: string | null;
  createdAt: string;
};

export type StoredEvidenceClaim = {
  id: string;
  queryRunId: string;
  sourceHitId: string;
  candidateId: string | null;
  caseId: string | null;
  claimType: EvidenceClaimType;
  text: string;
  claimStatus: ClaimStatus;
  provenance: SourceFieldReference[];
  createdByAiRunId: string | null;
  createdAt: string;
};

export const EMPTY_EXTRACTED_SOURCE_PACKET: ExtractedSourcePacket = {
  people: [],
  caseCaption: null,
  jurisdiction: null,
  courtOrAgency: null,
  docketNumber: null,
  caseNumber: null,
  eventDate: null,
  claims: []
};

const CLAIM_TYPES = new Set<EvidenceClaimType>([
  "online_media_reference",
  "court_recording_reference",
  "public_records_path",
  "commentary_or_recap",
  "ethical_restriction"
]);

const AI_CLAIM_STATUSES = new Set<AiClaimStatus>([
  "reasonable_inference",
  "speculative",
  "unsupported"
]);

type ValidationResult =
  | { success: true; data: ExtractedSourcePacket }
  | { success: false; errors: string[] };

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isReference(value: unknown): value is SourceFieldReference {
  const record = objectValue(value);
  return typeof record.sourceHitId === "string" && record.sourceHitId.trim().length > 0
    && typeof record.field === "string" && record.field.trim().length > 0;
}

function validateReferences(value: unknown, path: string, errors: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must contain at least one source reference`);
    return;
  }

  value.forEach((reference, index) => {
    if (!isReference(reference)) {
      errors.push(`${path}[${index}] must include sourceHitId and field`);
    }
  });
}

function validateExtractedValue(value: unknown, path: string, errors: string[]) {
  if (value === null) return;
  const record = objectValue(value);
  if (typeof record.value !== "string" || !record.value.trim()) {
    errors.push(`${path}.value must be a non-empty string`);
  }
  validateReferences(record.provenance, `${path}.provenance`, errors);
}

export function validateExtractedSourcePacket(value: unknown): ValidationResult {
  const errors: string[] = [];
  const record = objectValue(value);

  if (!Array.isArray(record.people)) {
    errors.push("people must be an array");
  } else {
    record.people.forEach((person, index) => {
      const personRecord = objectValue(person);
      if (typeof personRecord.name !== "string" || !personRecord.name.trim()) {
        errors.push(`people[${index}].name must be a non-empty string`);
      }
      if (personRecord.role !== null && typeof personRecord.role !== "string") {
        errors.push(`people[${index}].role must be string or null`);
      }
      validateReferences(personRecord.provenance, `people[${index}].provenance`, errors);
    });
  }

  for (const key of ["caseCaption", "jurisdiction", "courtOrAgency", "docketNumber", "caseNumber", "eventDate"] as const) {
    validateExtractedValue(record[key], key, errors);
  }

  if (!Array.isArray(record.claims)) {
    errors.push("claims must be an array");
  } else {
    record.claims.forEach((claim, index) => {
      const claimRecord = objectValue(claim);
      if (typeof claimRecord.type !== "string" || !CLAIM_TYPES.has(claimRecord.type as EvidenceClaimType)) {
        errors.push(`claims[${index}].type is invalid`);
      }
      if (claimRecord.status === "directly_supported_by_source") {
        errors.push("AI extraction cannot emit directly_supported_by_source claims");
      } else if (typeof claimRecord.status !== "string" || !AI_CLAIM_STATUSES.has(claimRecord.status as AiClaimStatus)) {
        errors.push(`claims[${index}].status is invalid`);
      }
      if (typeof claimRecord.text !== "string" || !claimRecord.text.trim()) {
        errors.push(`claims[${index}].text must be a non-empty string`);
      }
      validateReferences(claimRecord.provenance, `claims[${index}].provenance`, errors);
    });
  }

  if (errors.length) {
    return { success: false, errors };
  }

  return { success: true, data: record as ExtractedSourcePacket };
}
