import type { QueryIntent, QueryPlan } from "./query-planning";

export type SourceType =
  | "youtube"
  | "courtlistener"
  | "recap"
  | "pacer"
  | "muckrock"
  | "documentcloud"
  | "web"
  | "court_tv"
  | "law_crime"
  | "manual"
  | "seed";

export type ContentType =
  | "video"
  | "playlist"
  | "channel"
  | "document"
  | "docket"
  | "article"
  | "request"
  | "unknown";

export type PrimaryFootageType =
  | "interrogation"
  | "suspect_interview"
  | "confession"
  | "trial"
  | "bodycam"
  | "dashcam"
  | "audio_911"
  | "surveillance"
  | "jail_call"
  | "unknown";

export type AvailabilityStatus =
  | "online_full"
  | "online_partial"
  | "court_exhibit_reference"
  | "document_reference_only"
  | "needs_public_records_request"
  | "unknown";

export type AccessPath =
  | "online_full"
  | "online_partial"
  | "court_archive"
  | "court_clerk_request"
  | "recap_or_pacer"
  | "agency_public_records_request"
  | "muckrock_existing_request"
  | "muckrock_new_request"
  | "media_license_required"
  | "sealed_or_restricted"
  | "human_review"
  | "unknown";

export type ReviewDecision =
  | "watch_now"
  | "needs_research"
  | "request_footage"
  | "court_records_follow_up"
  | "reject_reenactment"
  | "reject_reaction_news_recap"
  | "reject_no_primary_footage"
  | "reject_too_speculative"
  | "reject_ethical_privacy_risk"
  | "reject_poor_av"
  | "already_covered";

export type RecommendedNextAction =
  | "watch_now"
  | "research_case"
  | "find_docket"
  | "find_transcript"
  | "draft_records_request"
  | "reject"
  | "human_review";

export type ClaimStatus =
  | "directly_supported_by_source"
  | "reasonable_inference"
  | "speculative"
  | "unsupported";

export type CandidatePenalty =
  | "reenactment_only"
  | "no_primary_footage"
  | "reaction_or_news_recap_only"
  | "minor_without_approval"
  | "active_case"
  | "graphic_private_victim_material"
  | "no_source_provenance"
  | "unclear_heavily_edited_repost"
  | "diagnosis_heavy_commentary"
  | "body_language_pseudoscience";

export type CandidateScoreInput = {
  primaryFootageScore: number;
  interrogationArcScore: number;
  psychologyRichnessScore: number;
  sourcingScore: number;
  structureScore: number;
  avQualityScore: number;
  ethicalSafetyScore: number;
  uniquenessScore: number;
  accessDifficultyScore: number;
  penalties: CandidatePenalty[];
};

export type CandidateScore = {
  primaryFootageScore: number;
  interrogationArcScore: number;
  psychologyRichnessScore: number;
  sourcingScore: number;
  structureScore: number;
  avQualityScore: number;
  ethicalSafetyScore: number;
  uniquenessScore: number;
  accessDifficultyScore: number;
  jcsFitScore: number;
  overallPriorityScore: number;
  scoreExplanation: string;
  penalties: CandidatePenalty[];
  penaltiesJson: Record<CandidatePenalty, number>;
};

export type CandidateScoreStatus =
  | "verified_source"
  | "provisional_metadata";

export type SourceHit = {
  id: string;
  sourceId: string;
  queryRunId: string;
  plannedQueryId: string | null;
  plannedQuery: string | null;
  queryIntent: QueryIntent | null;
  sourceType: SourceType;
  sourceName: string;
  externalId: string | null;
  url: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  authorOrChannel: string | null;
  rawJson: Record<string, unknown>;
  contentType: ContentType;
  ingestedAt: string;
};

export type CaseCluster = {
  id: string;
  canonicalTitle: string;
  alternateTitles: string[];
  jurisdiction: string | null;
  state: string | null;
  county: string | null;
  courtName: string | null;
  courtCaseNumber: string | null;
  agencyName: string | null;
  incidentNumber: string | null;
  caseStatus: string;
  crimeType: string | null;
  notes: string | null;
};

export type NormalizedCandidate = {
  id: string;
  queryRunId: string;
  sourceHitId: string;
  plannedQueryId: string | null;
  plannedQuery: string | null;
  queryIntent: QueryIntent | null;
  caseId: string;
  title: string;
  caseTitle: string;
  sourceName: string;
  sourceType: SourceType;
  footageTypes: PrimaryFootageType[];
  availabilityStatus: AvailabilityStatus;
  accessPath: AccessPath;
  sourcingConfidence: "low" | "medium" | "high";
  ethicalRisk: "low" | "medium" | "high";
  recommendedNextAction: RecommendedNextAction;
  reviewDecision: ReviewDecision | null;
  summary: string;
  provenance: Array<{
    label: string;
    url: string;
    claimStatus: ClaimStatus;
  }>;
  scoreStatus: CandidateScoreStatus;
  score: CandidateScore;
};

export type QueryRun = {
  id: string;
  sourceId: string;
  query: string;
  queryFamily: string;
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt: string | null;
  resultCount: number;
  error: string | null;
  queryPlan?: QueryPlan;
  sourceResults?: Array<{
    source: string;
    status: "succeeded" | "failed" | "skipped";
    resultCount: number;
    error?: string;
  }>;
};

export type SeedSweep = {
  queryRun: QueryRun;
  sourceHits: SourceHit[];
  cases: CaseCluster[];
  candidates: NormalizedCandidate[];
};
