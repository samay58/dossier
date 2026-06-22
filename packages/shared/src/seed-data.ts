import { classifyAccessPath } from "./access-path";
import { computeCandidateScore } from "./scoring";
import type {
  CaseCluster,
  NormalizedCandidate,
  QueryRun,
  SeedSweep,
  SourceHit
} from "./types";

const NOW = "2026-06-22T05:00:00.000Z";
const SEED_SOURCE_ID = "source-seed-demo";

function hit(partial: Omit<SourceHit, "sourceId" | "queryRunId" | "plannedQueryId" | "plannedQuery" | "queryIntent" | "ingestedAt">, queryRunId: string): SourceHit {
  return {
    ...partial,
    sourceId: SEED_SOURCE_ID,
    queryRunId,
    plannedQueryId: null,
    plannedQuery: null,
    queryIntent: null,
    ingestedAt: NOW
  };
}

const cases: CaseCluster[] = [
  {
    id: "case-anthony-todt",
    canonicalTitle: "State v. Anthony Todt",
    alternateTitles: ["Todt family murder trial", "Anthony Todt police interview"],
    jurisdiction: "Florida",
    state: "FL",
    county: "Osceola County",
    courtName: "Ninth Judicial Circuit Court",
    courtCaseNumber: "2020-CF-000000",
    agencyName: "Osceola County Sheriff Office",
    incidentNumber: "2020-001",
    caseStatus: "convicted",
    crimeType: "homicide",
    notes: "Seed case modeled for trial footage and police interview provenance."
  },
  {
    id: "case-sample-court-exhibit",
    canonicalTitle: "United States v. Sample",
    alternateTitles: ["Sample suppression hearing"],
    jurisdiction: "Federal",
    state: null,
    county: null,
    courtName: "U.S. District Court",
    courtCaseNumber: "1:24-cr-10",
    agencyName: "Federal Bureau of Investigation",
    incidentNumber: null,
    caseStatus: "closed",
    crimeType: "fraud",
    notes: "Seed docket reference for request workflow."
  }
];

export function createSeedSweep(query: string, queryRunId = `query-run-seed-${Date.now()}`): SeedSweep {
  const queryRun: QueryRun = {
    id: queryRunId,
    sourceId: SEED_SOURCE_ID,
    query,
    queryFamily: "court_media",
    status: "succeeded",
    startedAt: NOW,
    finishedAt: NOW,
    resultCount: 5,
    error: null
  };

  const hitIds = {
    todtTrialInterview: `${queryRun.id}-hit-todt-trial-interview`,
    todtCourtTv: `${queryRun.id}-hit-todt-courttv`,
    sampleMotion: `${queryRun.id}-hit-sample-motion`,
    reactionVideo: `${queryRun.id}-hit-reaction-video`,
    newsRecap: `${queryRun.id}-hit-news-recap`
  };

  const sourceHits = [
    hit(
      {
        id: hitIds.todtTrialInterview,
        sourceType: "youtube",
        sourceName: "Law&Crime Network",
        externalId: "yt-todt-001",
        url: "https://www.youtube.com/watch?v=seed-todt-interview",
        title: "Jury Views Anthony Todt Police Interview During Trial",
        description: "Trial footage where jurors view recorded police interview excerpts with courtroom context.",
        publishedAt: "2022-04-15T00:00:00.000Z",
        authorOrChannel: "Law&Crime Network",
        rawJson: { fixture: true, query },
        contentType: "video"
      },
      queryRun.id
    ),
    hit(
      {
        id: hitIds.todtCourtTv,
        sourceType: "court_tv",
        sourceName: "Court TV",
        externalId: "ctv-todt-archive",
        url: "https://www.courttv.com/title/seed-todt-trial-archive",
        title: "Court archive: Todt trial day with police interview exhibit",
        description: "Archive page referencing trial video with police interview exhibit discussed in open court.",
        publishedAt: "2022-04-16T00:00:00.000Z",
        authorOrChannel: "Court TV",
        rawJson: { fixture: true, query },
        contentType: "article"
      },
      queryRun.id
    ),
    hit(
      {
        id: hitIds.sampleMotion,
        sourceType: "courtlistener",
        sourceName: "CourtListener RECAP",
        externalId: "recap-sample-10",
        url: "https://www.courtlistener.com/docket/seed-sample",
        title: "Motion to suppress recorded interview and Miranda waiver",
        description: "Docket entry references recorded interview, Miranda waiver, and government exhibit list.",
        publishedAt: "2024-02-03T00:00:00.000Z",
        authorOrChannel: "CourtListener",
        rawJson: { fixture: true, docket: "1:24-cr-10", query },
        contentType: "docket"
      },
      queryRun.id
    ),
    hit(
      {
        id: hitIds.reactionVideo,
        sourceType: "youtube",
        sourceName: "Reaction Channel",
        externalId: "yt-reaction-001",
        url: "https://www.youtube.com/watch?v=seed-reaction",
        title: "Body language expert reacts to interrogation",
        description: "Commentary video with no primary footage and diagnosis claims.",
        publishedAt: "2025-01-01T00:00:00.000Z",
        authorOrChannel: "Reaction Channel",
        rawJson: { fixture: true, query },
        contentType: "video"
      },
      queryRun.id
    ),
    hit(
      {
        id: hitIds.newsRecap,
        sourceType: "web",
        sourceName: "Local News",
        externalId: "news-recap-001",
        url: "https://example.com/news-recap",
        title: "News recap describes confession video but shows only reporter package",
        description: "Article mentions a confession video but includes no primary footage or docket link.",
        publishedAt: "2024-06-20T00:00:00.000Z",
        authorOrChannel: "Local News",
        rawJson: { fixture: true, query },
        contentType: "article"
      },
      queryRun.id
    )
  ];

  const candidates = [
    {
      id: `${queryRun.id}-candidate-todt-trial-interview`,
      queryRunId: queryRun.id,
      sourceHitId: hitIds.todtTrialInterview,
      plannedQueryId: null,
      plannedQuery: null,
      queryIntent: null,
      caseId: "case-anthony-todt",
      title: "Jury Views Anthony Todt Police Interview During Trial",
      caseTitle: "State v. Anthony Todt",
      sourceName: "Law&Crime Network",
      sourceType: "youtube",
      footageTypes: ["trial", "suspect_interview"],
      availabilityStatus: "online_partial",
      accessPath: classifyAccessPath({
        sourceType: "youtube",
        sourceName: "Law&Crime Network",
        availabilityStatus: "online_partial",
        isOfficialAgencyUpload: false,
        isTrialArchive: true,
        mentionsDocketExhibit: true,
        mentionsSuppressionMotion: false,
        hasMuckRockFulfillment: false,
        hasEthicalRestriction: false
      }),
      sourcingConfidence: "high",
      ethicalRisk: "low",
      recommendedNextAction: "watch_now",
      reviewDecision: null,
      summary: "Trial footage appears to show an interview exhibit in open court with source provenance.",
      provenance: [
        {
          label: "Trial footage metadata",
          url: "https://www.youtube.com/watch?v=seed-todt-interview",
          claimStatus: "directly_supported_by_source"
        }
      ],
      scoreStatus: "verified_source",
      score: computeCandidateScore({
        primaryFootageScore: 18,
        interrogationArcScore: 14,
        psychologyRichnessScore: 12,
        sourcingScore: 14,
        structureScore: 8,
        avQualityScore: 8,
        ethicalSafetyScore: 9,
        uniquenessScore: 3,
        accessDifficultyScore: 8,
        penalties: []
      })
    },
    {
      id: `${queryRun.id}-candidate-todt-courttv`,
      queryRunId: queryRun.id,
      sourceHitId: hitIds.todtCourtTv,
      plannedQueryId: null,
      plannedQuery: null,
      queryIntent: null,
      caseId: "case-anthony-todt",
      title: "Court archive: Todt trial day with police interview exhibit",
      caseTitle: "State v. Anthony Todt",
      sourceName: "Court TV",
      sourceType: "court_tv",
      footageTypes: ["trial", "suspect_interview"],
      availabilityStatus: "court_exhibit_reference",
      accessPath: classifyAccessPath({
        sourceType: "court_tv",
        sourceName: "Court TV",
        availabilityStatus: "court_exhibit_reference",
        isOfficialAgencyUpload: false,
        isTrialArchive: true,
        mentionsDocketExhibit: true,
        mentionsSuppressionMotion: false,
        hasMuckRockFulfillment: false,
        hasEthicalRestriction: false
      }),
      sourcingConfidence: "high",
      ethicalRisk: "low",
      recommendedNextAction: "research_case",
      reviewDecision: null,
      summary: "Archive reference is useful for court provenance and may require licensing or clerk follow-up.",
      provenance: [
        {
          label: "Court archive reference",
          url: "https://www.courttv.com/title/seed-todt-trial-archive",
          claimStatus: "directly_supported_by_source"
        }
      ],
      scoreStatus: "verified_source",
      score: computeCandidateScore({
        primaryFootageScore: 15,
        interrogationArcScore: 10,
        psychologyRichnessScore: 10,
        sourcingScore: 13,
        structureScore: 7,
        avQualityScore: 7,
        ethicalSafetyScore: 9,
        uniquenessScore: 3,
        accessDifficultyScore: 7,
        penalties: []
      })
    },
    {
      id: `${queryRun.id}-candidate-sample-motion`,
      queryRunId: queryRun.id,
      sourceHitId: hitIds.sampleMotion,
      plannedQueryId: null,
      plannedQuery: null,
      queryIntent: null,
      caseId: "case-sample-court-exhibit",
      title: "Motion to suppress recorded interview and Miranda waiver",
      caseTitle: "United States v. Sample",
      sourceName: "CourtListener RECAP",
      sourceType: "courtlistener",
      footageTypes: ["suspect_interview"],
      availabilityStatus: "court_exhibit_reference",
      accessPath: classifyAccessPath({
        sourceType: "courtlistener",
        sourceName: "CourtListener RECAP",
        availabilityStatus: "court_exhibit_reference",
        isOfficialAgencyUpload: false,
        isTrialArchive: false,
        mentionsDocketExhibit: true,
        mentionsSuppressionMotion: true,
        hasMuckRockFulfillment: false,
        hasEthicalRestriction: false
      }),
      sourcingConfidence: "medium",
      ethicalRisk: "low",
      recommendedNextAction: "draft_records_request",
      reviewDecision: null,
      summary: "Docket language suggests a recorded interview exists, but the media itself is not online.",
      provenance: [
        {
          label: "RECAP docket reference",
          url: "https://www.courtlistener.com/docket/seed-sample",
          claimStatus: "directly_supported_by_source"
        }
      ],
      scoreStatus: "verified_source",
      score: computeCandidateScore({
        primaryFootageScore: 10,
        interrogationArcScore: 8,
        psychologyRichnessScore: 8,
        sourcingScore: 12,
        structureScore: 5,
        avQualityScore: 5,
        ethicalSafetyScore: 9,
        uniquenessScore: 4,
        accessDifficultyScore: 7,
        penalties: []
      })
    },
    {
      id: `${queryRun.id}-candidate-reaction-video`,
      queryRunId: queryRun.id,
      sourceHitId: hitIds.reactionVideo,
      plannedQueryId: null,
      plannedQuery: null,
      queryIntent: null,
      caseId: "case-anthony-todt",
      title: "Body language expert reacts to interrogation",
      caseTitle: "State v. Anthony Todt",
      sourceName: "Reaction Channel",
      sourceType: "youtube",
      footageTypes: ["unknown"],
      availabilityStatus: "unknown",
      accessPath: "unknown",
      sourcingConfidence: "low",
      ethicalRisk: "medium",
      recommendedNextAction: "reject",
      reviewDecision: null,
      summary: "Reaction-only source with diagnosis and body-language framing.",
      provenance: [
        {
          label: "Commentary metadata",
          url: "https://www.youtube.com/watch?v=seed-reaction",
          claimStatus: "directly_supported_by_source"
        }
      ],
      scoreStatus: "verified_source",
      score: computeCandidateScore({
        primaryFootageScore: 0,
        interrogationArcScore: 0,
        psychologyRichnessScore: 5,
        sourcingScore: 2,
        structureScore: 2,
        avQualityScore: 5,
        ethicalSafetyScore: 5,
        uniquenessScore: 0,
        accessDifficultyScore: 0,
        penalties: ["reaction_or_news_recap_only", "diagnosis_heavy_commentary", "body_language_pseudoscience"]
      })
    },
    {
      id: `${queryRun.id}-candidate-news-recap`,
      queryRunId: queryRun.id,
      sourceHitId: hitIds.newsRecap,
      plannedQueryId: null,
      plannedQuery: null,
      queryIntent: null,
      caseId: "case-sample-court-exhibit",
      title: "News recap describes confession video but shows only reporter package",
      caseTitle: "United States v. Sample",
      sourceName: "Local News",
      sourceType: "web",
      footageTypes: ["unknown"],
      availabilityStatus: "document_reference_only",
      accessPath: "unknown",
      sourcingConfidence: "low",
      ethicalRisk: "low",
      recommendedNextAction: "reject",
      reviewDecision: null,
      summary: "News recap mentions possible footage but provides no primary media or document provenance.",
      provenance: [
        {
          label: "Article metadata",
          url: "https://example.com/news-recap",
          claimStatus: "directly_supported_by_source"
        }
      ],
      scoreStatus: "verified_source",
      score: computeCandidateScore({
        primaryFootageScore: 0,
        interrogationArcScore: 0,
        psychologyRichnessScore: 0,
        sourcingScore: 1,
        structureScore: 1,
        avQualityScore: 3,
        ethicalSafetyScore: 8,
        uniquenessScore: 0,
        accessDifficultyScore: 0,
        penalties: ["no_primary_footage", "reaction_or_news_recap_only"]
      })
    }
  ] satisfies NormalizedCandidate[];

  candidates.sort((left, right) => right.score.overallPriorityScore - left.score.overallPriorityScore);

  return {
    queryRun,
    sourceHits,
    cases,
    candidates
  };
}
