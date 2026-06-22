import {
  classifyAccessPath,
  computeCandidateScore,
  type CaseCluster,
  type NormalizedCandidate,
  type SourceHit,
  type SourceType
} from "@interrogation/shared";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "unknown";
}

function likelyReject(text: string): boolean {
  return ["reaction", "recap", "reenactment", "body language expert", "podcast"].some((term) => text.includes(term));
}

function likelyPrimary(text: string): boolean {
  return [
    "full interrogation",
    "police interrogation",
    "police interview",
    "recorded interview",
    "suspect interview",
    "confession",
    "trial exhibit",
    "jury views",
    "miranda",
    "motion to suppress"
  ].some((term) => text.includes(term));
}

function sourceTrust(hit: SourceHit): "trusted" | "local" | "risky" | "unknown" {
  const text = `${hit.sourceName} ${hit.authorOrChannel ?? ""} ${hit.title}`.toLowerCase();
  if (["reaction", "body language", "behavior analyst", "podcast", "recap"].some((term) => text.includes(term))) {
    return "risky";
  }
  if (text.includes("court tv") || text.includes("law&crime") || text.includes("law crime") || text.includes("law and crime")) {
    return "trusted";
  }
  if (["police department", "sheriff", "district attorney", "state attorney", "superior court", "district court", "court archive"].some((term) => text.includes(term))) {
    return "trusted";
  }
  if (["local news", "news 4", "news 5", "news 6", "news 7", "news 8", "news 9", "news 10", "wabc", "kcbs", "wxyz", "kcal", "wesh"].some((term) => text.includes(term))) {
    return "local";
  }
  return "unknown";
}

function caseTitleFromHit(hit: SourceHit): string {
  const courtCaseMatch = hit.title.match(/\b(?:United States|State|People|Commonwealth)\s+v\.\s+[^:|]+/i);
  return courtCaseMatch?.[0].trim() ?? hit.title;
}

function createCaseFromHit(hit: SourceHit): CaseCluster {
  const caseTitle = caseTitleFromHit(hit);
  return {
    id: `case-live-${slugify(caseTitle)}`,
    canonicalTitle: caseTitle,
    alternateTitles: [hit.title].filter((title) => title !== caseTitle),
    jurisdiction: hit.sourceType === "courtlistener" ? "Federal or state court" : null,
    state: null,
    county: null,
    courtName: hit.authorOrChannel,
    courtCaseNumber: typeof hit.rawJson.docketNumber === "string" ? hit.rawJson.docketNumber : null,
    agencyName: null,
    incidentNumber: null,
    caseStatus: "unknown",
    crimeType: null,
    notes: `Live ${hit.sourceName} result. Verify provenance before relying on the dossier.`
  };
}

function scoreInputForHit(hit: SourceHit) {
  const text = `${hit.title} ${hit.description ?? ""}`.toLowerCase();
  const reject = likelyReject(text);
  const primary = likelyPrimary(text) && !reject;
  const courtReference = hit.sourceType === "courtlistener";
  const muckrock = hit.sourceType === "muckrock";
  const trust = sourceTrust(hit);
  const primaryMedia = hit.sourceType === "youtube" && primary;
  const trustedPrimary = primaryMedia && trust !== "risky";

  return {
    primaryFootageScore: trustedPrimary ? (trust === "trusted" ? 17 : 13) : courtReference ? 8 : muckrock ? 4 : 0,
    interrogationArcScore: primary ? 9 : courtReference ? 6 : 0,
    psychologyRichnessScore: primary ? 8 : courtReference ? 6 : 0,
    sourcingScore: courtReference || muckrock ? 11 : trust === "trusted" ? 10 : primary ? 7 : 2,
    structureScore: primary ? 5 : courtReference ? 4 : 3,
    avQualityScore: primaryMedia ? 6 : 3,
    ethicalSafetyScore: text.includes("juvenile") || text.includes("minor") ? 4 : 8,
    uniquenessScore: courtReference || muckrock ? 3 : 2,
    accessDifficultyScore: primaryMedia ? 8 : courtReference ? 6 : muckrock ? 7 : 3,
    penalties: [
      reject ? "reaction_or_news_recap_only" as const : null,
      !primary && !courtReference && !muckrock ? "no_primary_footage" as const : null,
      trust === "risky" && primary ? "unclear_heavily_edited_repost" as const : null,
      text.includes("body language") ? "body_language_pseudoscience" as const : null,
      text.includes("diagnos") ? "diagnosis_heavy_commentary" as const : null
    ].filter((penalty): penalty is NonNullable<typeof penalty> => Boolean(penalty))
  };
}

export function candidateFromHit(hit: SourceHit): { caseRecord: CaseCluster; candidate: NormalizedCandidate } {
  const text = `${hit.title} ${hit.description ?? ""}`.toLowerCase();
  const reject = likelyReject(text);
  const primary = likelyPrimary(text) && !reject;
  const caseRecord = createCaseFromHit(hit);
  const sourceType = hit.sourceType as SourceType;
  const courtReference = sourceType === "courtlistener";
  const muckrock = sourceType === "muckrock";
  const trust = sourceTrust(hit);
  const youtubeWatchCandidate = sourceType === "youtube" && primary && trust !== "risky";
  const muckrockFulfilled = muckrock && text.includes("done");
  const accessPath = classifyAccessPath({
    sourceType,
    sourceName: hit.sourceName,
    availabilityStatus: youtubeWatchCandidate ? "online_partial" : courtReference ? "court_exhibit_reference" : muckrock ? "needs_public_records_request" : "unknown",
    isOfficialAgencyUpload: trust === "trusted" && text.includes("police"),
    isTrialArchive: text.includes("trial") || text.includes("jury views"),
    mentionsDocketExhibit: text.includes("exhibit") || text.includes("jury views"),
    mentionsSuppressionMotion: text.includes("motion to suppress") || text.includes("miranda"),
    hasMuckRockFulfillment: muckrockFulfilled,
    hasEthicalRestriction: text.includes("juvenile") || text.includes("sealed")
  });
  const recommendedNextAction = reject
    ? "reject"
    : youtubeWatchCandidate
      ? "watch_now"
      : courtReference
        ? text.includes("docket") || text.includes("exhibit") || text.includes("miranda") || text.includes("recorded")
          ? "draft_records_request"
          : "find_docket"
        : muckrock
          ? muckrockFulfilled ? "draft_records_request" : "research_case"
          : "research_case";

  return {
    caseRecord,
    candidate: {
      id: `candidate-live-${slugify(hit.queryRunId)}-${slugify(hit.id)}`,
      queryRunId: hit.queryRunId,
      sourceHitId: hit.id,
      plannedQueryId: hit.plannedQueryId,
      plannedQuery: hit.plannedQuery,
      queryIntent: hit.queryIntent,
      caseId: caseRecord.id,
      title: hit.title,
      caseTitle: caseRecord.canonicalTitle,
      sourceName: hit.sourceName,
      sourceType,
      footageTypes: primary || courtReference ? ["suspect_interview"] : ["unknown"],
      availabilityStatus: youtubeWatchCandidate ? "online_partial" : courtReference ? "court_exhibit_reference" : muckrock ? "needs_public_records_request" : "unknown",
      accessPath,
      sourcingConfidence: courtReference || muckrock || trust === "trusted" ? "high" : primary ? "medium" : "low",
      ethicalRisk: text.includes("juvenile") || text.includes("sealed") ? "high" : "low",
      recommendedNextAction,
      reviewDecision: null,
      summary: youtubeWatchCandidate
        ? "Metadata and source trust suggest this may reference primary footage. Treat the score as provisional until the source packet is reviewed."
        : courtReference
          ? "Court metadata may reference a recorded interview or exhibit. This is a research lead, not verified footage."
          : muckrock
            ? "MuckRock metadata may identify a records path. Review the request before drafting any follow-up."
            : "Metadata needs source review before it can be treated as primary footage.",
      provenance: [
        {
          label: `${hit.sourceName} metadata`,
          url: hit.url,
          claimStatus: "directly_supported_by_source"
        },
        {
          label: "Primary-footage classification from title and description",
          url: hit.url,
          claimStatus: primary || courtReference ? "reasonable_inference" : "speculative"
        }
      ],
      scoreStatus: "provisional_metadata",
      score: computeCandidateScore(scoreInputForHit(hit))
    }
  };
}
