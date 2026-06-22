-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('youtube', 'courtlistener', 'recap', 'pacer', 'muckrock', 'documentcloud', 'web', 'court_tv', 'law_crime', 'manual', 'seed');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('video', 'playlist', 'channel', 'document', 'docket', 'article', 'request', 'unknown');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('unknown', 'investigation', 'charged', 'trial_pending', 'convicted', 'plea', 'acquitted', 'appeal_pending', 'closed', 'exonerated');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('suspect', 'defendant', 'victim', 'detective', 'prosecutor', 'defense', 'judge', 'witness', 'other');

-- CreateEnum
CREATE TYPE "PublicFigureLevel" AS ENUM ('unknown', 'private_person', 'limited_public_case_figure', 'public_official');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('interrogation', 'suspect_interview', 'confession', 'trial', 'bodycam', 'dashcam', 'audio_911', 'surveillance', 'jail_call', 'press_conference', 'other');

-- CreateEnum
CREATE TYPE "RightsStatus" AS ENUM ('unknown', 'public_web', 'public_record', 'court_record', 'licensed', 'owned', 'do_not_store', 'restricted');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('online', 'partial_online', 'metadata_only', 'requested', 'received', 'denied', 'sealed', 'unknown');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('docket', 'motion', 'order', 'opinion', 'transcript', 'affidavit', 'warrant', 'police_report', 'public_records_response', 'article', 'other');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('not_needed', 'pending', 'done', 'failed');

-- CreateEnum
CREATE TYPE "SpeakerRole" AS ENUM ('detective', 'suspect', 'attorney', 'judge', 'witness', 'unknown');

-- CreateEnum
CREATE TYPE "TranscriptCreatedBy" AS ENUM ('caption_import', 'asr', 'manual', 'court_transcript');

-- CreateEnum
CREATE TYPE "InterrogationSignalType" AS ENUM ('rapport_building', 'free_narrative', 'clarification', 'strategic_evidence_withholding', 'evidence_reveal', 'statement_evidence_inconsistency', 'minimization', 'maximization', 'alternative_question', 'denial_loop', 'partial_admission', 'full_confession', 'post_admission_detailing', 'contamination_risk', 'false_confession_risk', 'miranda_issue', 'lawyer_request_issue', 'fatigue_or_duration_issue', 'vulnerability_issue', 'unknown');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('state_public_records', 'foia', 'court_clerk', 'media_license', 'other');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'ready_for_review', 'submitted', 'acknowledged', 'fee_estimate', 'fulfilled', 'partially_fulfilled', 'denied', 'appealed', 'closed');

-- CreateEnum
CREATE TYPE "SubmittedVia" AS ENUM ('manual', 'muckrock', 'email', 'portal', 'mail', 'unknown');

-- CreateEnum
CREATE TYPE "ReviewDecisionValue" AS ENUM ('watch_now', 'needs_research', 'request_footage', 'court_records_follow_up', 'reject_reenactment', 'reject_reaction_news_recap', 'reject_no_primary_footage', 'reject_too_speculative', 'reject_ethical_privacy_risk', 'reject_poor_av', 'already_covered');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('online_full', 'online_partial', 'court_exhibit_reference', 'document_reference_only', 'needs_public_records_request', 'unknown');

-- CreateEnum
CREATE TYPE "AccessPathValue" AS ENUM ('online_full', 'online_partial', 'court_archive', 'court_clerk_request', 'recap_or_pacer', 'agency_public_records_request', 'muckrock_existing_request', 'muckrock_new_request', 'media_license_required', 'sealed_or_restricted', 'human_review', 'unknown');

-- CreateEnum
CREATE TYPE "RecommendedNextAction" AS ENUM ('watch_now', 'research_case', 'find_docket', 'find_transcript', 'draft_records_request', 'reject', 'human_review');

-- CreateEnum
CREATE TYPE "CandidateScoreStatus" AS ENUM ('verified_source', 'provisional_metadata');

-- CreateEnum
CREATE TYPE "QueryIntentValue" AS ENUM ('online_primary_media', 'court_record_reference', 'suppression_or_miranda', 'trial_exhibit', 'public_records_request', 'negative_filter_probe');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('succeeded', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "EvidenceClaimType" AS ENUM ('online_media_reference', 'court_recording_reference', 'public_records_path', 'commentary_or_recap', 'ethical_restriction');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "baseUrl" TEXT,
    "termsNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_runs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "queryFamily" TEXT NOT NULL,
    "paramsJson" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "QueryStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "query_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_hits" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "plannedQueryId" TEXT,
    "plannedQuery" TEXT,
    "queryIntent" "QueryIntentValue",
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "publishedAt" TIMESTAMP(3),
    "authorOrChannel" TEXT,
    "rawJson" JSONB NOT NULL,
    "contentType" "ContentType" NOT NULL DEFAULT 'unknown',
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_hits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "canonicalTitle" TEXT NOT NULL,
    "alternateTitles" TEXT[],
    "jurisdiction" TEXT,
    "state" TEXT,
    "county" TEXT,
    "courtName" TEXT,
    "courtCaseNumber" TEXT,
    "agencyName" TEXT,
    "incidentNumber" TEXT,
    "caseStatus" "CaseStatus" NOT NULL DEFAULT 'unknown',
    "crimeType" TEXT,
    "eventDate" DATE,
    "arrestDate" DATE,
    "trialDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_people" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,
    "isMinor" BOOLEAN,
    "publicFigureLevel" "PublicFigureLevel" NOT NULL DEFAULT 'unknown',
    "notes" TEXT,

    CONSTRAINT "case_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "sourceHitId" TEXT,
    "assetType" "AssetType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "storagePath" TEXT,
    "rightsStatus" "RightsStatus" NOT NULL DEFAULT 'unknown',
    "accessStatus" "AccessStatus" NOT NULL DEFAULT 'unknown',
    "durationSeconds" INTEGER,
    "audioQuality" INTEGER,
    "videoQuality" INTEGER,
    "hasTranscript" BOOLEAN NOT NULL DEFAULT false,
    "containsMinors" BOOLEAN,
    "containsGraphicContent" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "sourceHitId" TEXT,
    "docType" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "storagePath" TEXT,
    "sourceName" TEXT NOT NULL,
    "dateFiledOrPublished" DATE,
    "textExtracted" TEXT,
    "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'not_needed',
    "provenanceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "speakerLabel" TEXT,
    "speakerRole" "SpeakerRole" NOT NULL DEFAULT 'unknown',
    "startSeconds" DOUBLE PRECISION NOT NULL,
    "endSeconds" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdBy" "TranscriptCreatedBy" NOT NULL,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interrogation_signals" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "transcriptSegmentId" TEXT,
    "startSeconds" DOUBLE PRECISION,
    "endSeconds" DOUBLE PRECISION,
    "signalType" "InterrogationSignalType" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceQuote" TEXT,
    "confidence" "ConfidenceLevel" NOT NULL,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interrogation_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_scores" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "sourceHitId" TEXT,
    "mediaAssetId" TEXT,
    "primaryFootageScore" INTEGER NOT NULL,
    "interrogationArcScore" INTEGER NOT NULL,
    "psychologyRichnessScore" INTEGER NOT NULL,
    "sourcingScore" INTEGER NOT NULL,
    "structureScore" INTEGER NOT NULL,
    "avQualityScore" INTEGER NOT NULL,
    "ethicalSafetyScore" INTEGER NOT NULL,
    "uniquenessScore" INTEGER NOT NULL,
    "jcsFitScore" INTEGER NOT NULL,
    "accessDifficultyScore" INTEGER NOT NULL,
    "overallPriorityScore" INTEGER NOT NULL,
    "scoreExplanation" TEXT NOT NULL,
    "penaltiesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "sourceHitId" TEXT NOT NULL,
    "plannedQueryId" TEXT,
    "plannedQuery" TEXT,
    "queryIntent" "QueryIntentValue",
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseTitle" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "footageTypes" TEXT[],
    "availabilityStatus" "AvailabilityStatus" NOT NULL,
    "accessPath" "AccessPathValue" NOT NULL,
    "sourcingConfidence" "ConfidenceLevel" NOT NULL,
    "ethicalRisk" "ConfidenceLevel" NOT NULL,
    "recommendedNextAction" "RecommendedNextAction" NOT NULL,
    "reviewDecision" "ReviewDecisionValue",
    "summary" TEXT NOT NULL,
    "provenanceJson" JSONB NOT NULL,
    "scoreStatus" "CandidateScoreStatus" NOT NULL,
    "scoreJson" JSONB NOT NULL,
    "overallPriorityScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_records_requests" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "agencyJurisdiction" TEXT NOT NULL,
    "requestType" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'draft',
    "requestText" TEXT NOT NULL,
    "submittedVia" "SubmittedVia",
    "submittedAt" TIMESTAMP(3),
    "dueDate" DATE,
    "responseSummary" TEXT,
    "feeEstimate" DECIMAL(10,2),
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_records_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_decisions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "sourceHitId" TEXT,
    "decision" "ReviewDecisionValue" NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "sourceHitId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" "AiRunStatus" NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_claims" (
    "id" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "sourceHitId" TEXT NOT NULL,
    "candidateId" TEXT,
    "caseId" TEXT,
    "claimType" "EvidenceClaimType" NOT NULL,
    "text" TEXT NOT NULL,
    "claimStatus" TEXT NOT NULL,
    "provenanceJson" JSONB NOT NULL,
    "createdByAiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "query_runs_sourceId_queryFamily_idx" ON "query_runs"("sourceId", "queryFamily");

-- CreateIndex
CREATE INDEX "source_hits_queryRunId_idx" ON "source_hits"("queryRunId");

-- CreateIndex
CREATE INDEX "source_hits_sourceId_externalId_idx" ON "source_hits"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "source_hits_url_idx" ON "source_hits"("url");

-- CreateIndex
CREATE INDEX "cases_canonicalTitle_idx" ON "cases"("canonicalTitle");

-- CreateIndex
CREATE INDEX "cases_courtCaseNumber_idx" ON "cases"("courtCaseNumber");

-- CreateIndex
CREATE INDEX "case_people_caseId_role_idx" ON "case_people"("caseId", "role");

-- CreateIndex
CREATE INDEX "media_assets_caseId_idx" ON "media_assets"("caseId");

-- CreateIndex
CREATE INDEX "media_assets_sourceHitId_idx" ON "media_assets"("sourceHitId");

-- CreateIndex
CREATE INDEX "documents_caseId_idx" ON "documents"("caseId");

-- CreateIndex
CREATE INDEX "documents_sourceHitId_idx" ON "documents"("sourceHitId");

-- CreateIndex
CREATE INDEX "transcript_segments_mediaAssetId_idx" ON "transcript_segments"("mediaAssetId");

-- CreateIndex
CREATE INDEX "interrogation_signals_caseId_idx" ON "interrogation_signals"("caseId");

-- CreateIndex
CREATE INDEX "interrogation_signals_mediaAssetId_idx" ON "interrogation_signals"("mediaAssetId");

-- CreateIndex
CREATE INDEX "candidate_scores_caseId_idx" ON "candidate_scores"("caseId");

-- CreateIndex
CREATE INDEX "candidate_scores_sourceHitId_idx" ON "candidate_scores"("sourceHitId");

-- CreateIndex
CREATE INDEX "candidate_scores_overallPriorityScore_idx" ON "candidate_scores"("overallPriorityScore");

-- CreateIndex
CREATE INDEX "candidates_queryRunId_idx" ON "candidates"("queryRunId");

-- CreateIndex
CREATE INDEX "candidates_caseId_idx" ON "candidates"("caseId");

-- CreateIndex
CREATE INDEX "candidates_sourceHitId_idx" ON "candidates"("sourceHitId");

-- CreateIndex
CREATE INDEX "candidates_overallPriorityScore_idx" ON "candidates"("overallPriorityScore");

-- CreateIndex
CREATE INDEX "public_records_requests_caseId_status_idx" ON "public_records_requests"("caseId", "status");

-- CreateIndex
CREATE INDEX "review_decisions_caseId_idx" ON "review_decisions"("caseId");

-- CreateIndex
CREATE INDEX "review_decisions_sourceHitId_idx" ON "review_decisions"("sourceHitId");

-- CreateIndex
CREATE INDEX "ai_runs_queryRunId_idx" ON "ai_runs"("queryRunId");

-- CreateIndex
CREATE INDEX "ai_runs_sourceHitId_idx" ON "ai_runs"("sourceHitId");

-- CreateIndex
CREATE INDEX "evidence_claims_queryRunId_idx" ON "evidence_claims"("queryRunId");

-- CreateIndex
CREATE INDEX "evidence_claims_sourceHitId_idx" ON "evidence_claims"("sourceHitId");

-- CreateIndex
CREATE INDEX "evidence_claims_caseId_idx" ON "evidence_claims"("caseId");

-- CreateIndex
CREATE INDEX "evidence_claims_createdByAiRunId_idx" ON "evidence_claims"("createdByAiRunId");

-- AddForeignKey
ALTER TABLE "query_runs" ADD CONSTRAINT "query_runs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_hits" ADD CONSTRAINT "source_hits_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_hits" ADD CONSTRAINT "source_hits_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "query_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_people" ADD CONSTRAINT "case_people_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interrogation_signals" ADD CONSTRAINT "interrogation_signals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interrogation_signals" ADD CONSTRAINT "interrogation_signals_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interrogation_signals" ADD CONSTRAINT "interrogation_signals_transcriptSegmentId_fkey" FOREIGN KEY ("transcriptSegmentId") REFERENCES "transcript_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_scores" ADD CONSTRAINT "candidate_scores_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_scores" ADD CONSTRAINT "candidate_scores_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_scores" ADD CONSTRAINT "candidate_scores_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "query_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_records_requests" ADD CONSTRAINT "public_records_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "query_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "query_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_sourceHitId_fkey" FOREIGN KEY ("sourceHitId") REFERENCES "source_hits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_createdByAiRunId_fkey" FOREIGN KEY ("createdByAiRunId") REFERENCES "ai_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
