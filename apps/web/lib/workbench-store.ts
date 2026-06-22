import { PrismaClient, type Prisma } from "@prisma/client";
import type {
  CaseCluster,
  AiExtractionResult,
  AiRunRecord,
  CandidateScore,
  NormalizedCandidate,
  QueryRun,
  QueryIntent,
  ReviewDecision,
  SourceHit,
  StoredEvidenceClaim
} from "@interrogation/shared";
import type { CandidateReviewInput, RecordsRequestInput, StoredRecordsRequest } from "./repository";

export type CandidateListFilter = {
  queryRunId?: string;
};

export type SweepPayload = {
  queryRun: QueryRun;
  sourceHits: SourceHit[];
  cases: CaseCluster[];
  candidates: NormalizedCandidate[];
};

export type WorkbenchStore = {
  saveSweep(payload: SweepPayload): Promise<void>;
  getSweep(id: string): Promise<QueryRun | null>;
  listCandidates(filter?: CandidateListFilter): Promise<NormalizedCandidate[]>;
  getCandidate(id: string): Promise<NormalizedCandidate | null>;
  reviewCandidate(id: string, review: CandidateReviewInput): Promise<NormalizedCandidate>;
  listCases(): Promise<CaseCluster[]>;
  getCase(id: string): Promise<CaseCluster | null>;
  listCaseCandidates(caseId: string): Promise<NormalizedCandidate[]>;
  createRecordsRequestDraft(input: RecordsRequestInput, draftText: string, agencyName: string, agencyJurisdiction: string): Promise<StoredRecordsRequest>;
  listRecordsRequests(): Promise<StoredRecordsRequest[]>;
  saveAiExtraction(input: { queryRunId: string; sourceHit: SourceHit; result: AiExtractionResult }): Promise<void>;
  listCaseEvidenceClaims(caseId: string): Promise<StoredEvidenceClaim[]>;
};

type RepositoryState = {
  queryRuns: QueryRun[];
  sourceHits: SourceHit[];
  cases: CaseCluster[];
  candidates: NormalizedCandidate[];
  recordsRequests: StoredRecordsRequest[];
  aiRuns: AiRunRecord[];
  evidenceClaims: StoredEvidenceClaim[];
};

function emptyState(): RepositoryState {
  return {
    queryRuns: [],
    sourceHits: [],
    cases: [],
    candidates: [],
    recordsRequests: [],
    aiRuns: [],
    evidenceClaims: []
  };
}

function upsertById<T extends { id: string }>(items: T[], nextItems: T[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const item of nextItems) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

function sortCandidates(candidates: NormalizedCandidate[]): NormalizedCandidate[] {
  return [...candidates].sort((left, right) => right.score.overallPriorityScore - left.score.overallPriorityScore);
}

export function createMemoryWorkbenchStore(initialState: RepositoryState = emptyState()): WorkbenchStore {
  const state = initialState;

  return {
    async saveSweep(payload) {
      state.queryRuns = upsertById(state.queryRuns, [payload.queryRun]);
      state.sourceHits = upsertById(state.sourceHits, payload.sourceHits);
      state.cases = upsertById(state.cases, payload.cases);
      state.candidates = sortCandidates(upsertById(state.candidates, payload.candidates));
    },

    async getSweep(id) {
      return state.queryRuns.find((queryRun) => queryRun.id === id) ?? null;
    },

    async listCandidates(filter = {}) {
      return sortCandidates(state.candidates.filter((candidate) => !filter.queryRunId || candidate.queryRunId === filter.queryRunId));
    },

    async getCandidate(id) {
      return state.candidates.find((candidate) => candidate.id === id) ?? null;
    },

    async reviewCandidate(id, review) {
      const candidate = state.candidates.find((item) => item.id === id);
      if (!candidate) {
        throw new Error(`Candidate not found: ${id}`);
      }

      const reviewed = {
        ...candidate,
        reviewDecision: review.decision
      };

      state.candidates = state.candidates.map((item) => (item.id === id ? reviewed : item));
      return reviewed;
    },

    async listCases() {
      return [...state.cases].sort((left, right) => left.canonicalTitle.localeCompare(right.canonicalTitle));
    },

    async getCase(id) {
      return state.cases.find((caseRecord) => caseRecord.id === id) ?? null;
    },

    async listCaseCandidates(caseId) {
      return sortCandidates(state.candidates.filter((candidate) => candidate.caseId === caseId));
    },

    async createRecordsRequestDraft(input, draftText, agencyName, agencyJurisdiction) {
      const now = new Date().toISOString();
      const request: StoredRecordsRequest = {
        id: `request-${state.recordsRequests.length + 1}`,
        caseId: input.caseId,
        agencyName,
        agencyJurisdiction,
        requestType: input.requestType,
        status: "draft",
        requestText: draftText,
        submittedAt: null,
        dueDate: null,
        feeEstimate: null,
        externalUrl: null,
        createdAt: now,
        updatedAt: now
      };

      state.recordsRequests = [request, ...state.recordsRequests];
      return request;
    },

    async listRecordsRequests() {
      return [...state.recordsRequests];
    },

    async saveAiExtraction(input) {
      const now = new Date().toISOString();
      const candidate = state.candidates.find((item) => item.queryRunId === input.queryRunId && item.sourceHitId === input.sourceHit.id) ?? null;
      const aiRun: AiRunRecord = {
        id: `ai-run-${state.aiRuns.length + 1}-${input.sourceHit.id}`,
        queryRunId: input.queryRunId,
        sourceHitId: input.sourceHit.id,
        taskType: input.result.taskType,
        provider: input.result.provider,
        model: input.result.model,
        status: input.result.status,
        inputJson: { sourceHit: input.sourceHit },
        outputJson: input.result.output as unknown as Record<string, unknown>,
        error: input.result.error,
        createdAt: now
      };

      state.aiRuns = [aiRun, ...state.aiRuns];
      if (input.result.status !== "succeeded") return;

      const claims = input.result.output.claims.map((claim, index): StoredEvidenceClaim => ({
        id: `evidence-claim-${state.evidenceClaims.length + index + 1}-${input.sourceHit.id}`,
        queryRunId: input.queryRunId,
        sourceHitId: input.sourceHit.id,
        candidateId: candidate?.id ?? null,
        caseId: candidate?.caseId ?? null,
        claimType: claim.type,
        text: claim.text,
        claimStatus: claim.status,
        provenance: claim.provenance,
        createdByAiRunId: aiRun.id,
        createdAt: now
      }));

      state.evidenceClaims = [...claims, ...state.evidenceClaims];
    },

    async listCaseEvidenceClaims(caseId) {
      return state.evidenceClaims.filter((claim) => claim.caseId === caseId);
    }
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceMeta(sourceId: string, sourceType?: SourceHit["sourceType"]): { id: string; name: string; type: SourceHit["sourceType"] } {
  const known: Record<string, { name: string; type: SourceHit["sourceType"] }> = {
    "source-seed-demo": { name: "Seed fixtures", type: "seed" },
    "source-youtube": { name: "YouTube Data API", type: "youtube" },
    "source-courtlistener": { name: "CourtListener RECAP", type: "courtlistener" },
    "source-muckrock": { name: "MuckRock", type: "muckrock" },
    "source-live": { name: "Live connector sweep", type: "web" }
  };
  const meta = known[sourceId] ?? { name: sourceId, type: sourceType ?? "web" };
  return { id: sourceId, ...meta };
}

function toJson(value: unknown): object {
  return typeof value === "object" && value !== null ? value : {};
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function caseCreateData(caseRecord: CaseCluster): Prisma.CaseUncheckedCreateInput {
  return {
    id: caseRecord.id,
    canonicalTitle: caseRecord.canonicalTitle,
    alternateTitles: caseRecord.alternateTitles,
    jurisdiction: caseRecord.jurisdiction,
    state: caseRecord.state,
    county: caseRecord.county,
    courtName: caseRecord.courtName,
    courtCaseNumber: caseRecord.courtCaseNumber,
    agencyName: caseRecord.agencyName,
    incidentNumber: caseRecord.incidentNumber,
    caseStatus: caseRecord.caseStatus as Prisma.CaseUncheckedCreateInput["caseStatus"],
    crimeType: caseRecord.crimeType,
    notes: caseRecord.notes
  };
}

function caseUpdateData(caseRecord: CaseCluster): Prisma.CaseUncheckedUpdateInput {
  return caseCreateData(caseRecord);
}

function candidateFromRow(row: {
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
  sourceType: NormalizedCandidate["sourceType"];
  footageTypes: string[];
  availabilityStatus: NormalizedCandidate["availabilityStatus"];
  accessPath: NormalizedCandidate["accessPath"];
  sourcingConfidence: NormalizedCandidate["sourcingConfidence"];
  ethicalRisk: NormalizedCandidate["ethicalRisk"];
  recommendedNextAction: NormalizedCandidate["recommendedNextAction"];
  reviewDecision: ReviewDecision | null;
  summary: string;
  provenanceJson: unknown;
  scoreStatus: NormalizedCandidate["scoreStatus"];
  scoreJson: unknown;
}): NormalizedCandidate {
  return {
    id: row.id,
    queryRunId: row.queryRunId,
    sourceHitId: row.sourceHitId,
    plannedQueryId: row.plannedQueryId,
    plannedQuery: row.plannedQuery,
    queryIntent: row.queryIntent,
    caseId: row.caseId,
    title: row.title,
    caseTitle: row.caseTitle,
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    footageTypes: row.footageTypes as NormalizedCandidate["footageTypes"],
    availabilityStatus: row.availabilityStatus,
    accessPath: row.accessPath,
    sourcingConfidence: row.sourcingConfidence,
    ethicalRisk: row.ethicalRisk,
    recommendedNextAction: row.recommendedNextAction,
    reviewDecision: row.reviewDecision,
    summary: row.summary,
    provenance: Array.isArray(row.provenanceJson) ? row.provenanceJson as NormalizedCandidate["provenance"] : [],
    scoreStatus: row.scoreStatus,
    score: row.scoreJson as CandidateScore
  };
}

function caseFromRow(row: {
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
}): CaseCluster {
  return {
    id: row.id,
    canonicalTitle: row.canonicalTitle,
    alternateTitles: row.alternateTitles,
    jurisdiction: row.jurisdiction,
    state: row.state,
    county: row.county,
    courtName: row.courtName,
    courtCaseNumber: row.courtCaseNumber,
    agencyName: row.agencyName,
    incidentNumber: row.incidentNumber,
    caseStatus: row.caseStatus,
    crimeType: row.crimeType,
    notes: row.notes
  };
}

function queryRunFromRow(row: {
  id: string;
  sourceId: string;
  query: string;
  queryFamily: string;
  status: QueryRun["status"];
  startedAt: Date;
  finishedAt: Date | null;
  resultCount: number;
  error: string | null;
  paramsJson: unknown;
}): QueryRun {
  const params = toJson(row.paramsJson) as { sourceResults?: QueryRun["sourceResults"]; queryPlan?: QueryRun["queryPlan"] };
  return {
    id: row.id,
    sourceId: row.sourceId,
    query: row.query,
    queryFamily: row.queryFamily,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    resultCount: row.resultCount,
    error: row.error,
    queryPlan: params.queryPlan,
    sourceResults: params.sourceResults
  };
}

function evidenceClaimFromRow(row: {
  id: string;
  queryRunId: string;
  sourceHitId: string;
  candidateId: string | null;
  caseId: string | null;
  claimType: StoredEvidenceClaim["claimType"];
  text: string;
  claimStatus: string;
  provenanceJson: unknown;
  createdByAiRunId: string | null;
  createdAt: Date;
}): StoredEvidenceClaim {
  return {
    id: row.id,
    queryRunId: row.queryRunId,
    sourceHitId: row.sourceHitId,
    candidateId: row.candidateId,
    caseId: row.caseId,
    claimType: row.claimType,
    text: row.text,
    claimStatus: row.claimStatus as StoredEvidenceClaim["claimStatus"],
    provenance: Array.isArray(row.provenanceJson) ? row.provenanceJson as StoredEvidenceClaim["provenance"] : [],
    createdByAiRunId: row.createdByAiRunId,
    createdAt: row.createdAt.toISOString()
  };
}

export function createPrismaWorkbenchStore(prisma = new PrismaClient()): WorkbenchStore {
  return {
    async saveSweep(payload) {
      const sources = new Map<string, ReturnType<typeof sourceMeta>>();
      sources.set(payload.queryRun.sourceId, sourceMeta(payload.queryRun.sourceId));
      for (const hit of payload.sourceHits) {
        sources.set(hit.sourceId, sourceMeta(hit.sourceId, hit.sourceType));
      }

      await prisma.$transaction(async (tx) => {
        for (const source of sources.values()) {
          await tx.source.upsert({
            where: { id: source.id },
            update: { name: source.name, type: source.type },
            create: { id: source.id, name: source.name, type: source.type }
          });
        }

        await tx.queryRun.upsert({
          where: { id: payload.queryRun.id },
          update: {
            sourceId: payload.queryRun.sourceId,
            query: payload.queryRun.query,
            queryFamily: payload.queryRun.queryFamily,
            paramsJson: { sourceResults: payload.queryRun.sourceResults ?? [], queryPlan: payload.queryRun.queryPlan },
            startedAt: parseDate(payload.queryRun.startedAt) ?? new Date(),
            finishedAt: parseDate(payload.queryRun.finishedAt),
            status: payload.queryRun.status,
            error: payload.queryRun.error,
            resultCount: payload.queryRun.resultCount
          },
          create: {
            id: payload.queryRun.id,
            sourceId: payload.queryRun.sourceId,
            query: payload.queryRun.query,
            queryFamily: payload.queryRun.queryFamily,
            paramsJson: { sourceResults: payload.queryRun.sourceResults ?? [], queryPlan: payload.queryRun.queryPlan },
            startedAt: parseDate(payload.queryRun.startedAt) ?? new Date(),
            finishedAt: parseDate(payload.queryRun.finishedAt),
            status: payload.queryRun.status,
            error: payload.queryRun.error,
            resultCount: payload.queryRun.resultCount
          }
        });

        for (const caseRecord of payload.cases) {
          await tx.case.upsert({
            where: { id: caseRecord.id },
            update: caseUpdateData(caseRecord),
            create: caseCreateData(caseRecord)
          });
        }

        for (const hit of payload.sourceHits) {
          await tx.sourceHit.upsert({
            where: { id: hit.id },
            update: {
              sourceId: hit.sourceId,
              queryRunId: hit.queryRunId,
              plannedQueryId: hit.plannedQueryId,
              plannedQuery: hit.plannedQuery,
              queryIntent: hit.queryIntent,
              externalId: hit.externalId,
              url: hit.url,
              title: hit.title,
              description: hit.description,
              publishedAt: parseDate(hit.publishedAt),
              authorOrChannel: hit.authorOrChannel,
              rawJson: jsonInput(hit.rawJson),
              contentType: hit.contentType,
              ingestedAt: parseDate(hit.ingestedAt) ?? new Date()
            },
            create: {
              id: hit.id,
              sourceId: hit.sourceId,
              queryRunId: hit.queryRunId,
              plannedQueryId: hit.plannedQueryId,
              plannedQuery: hit.plannedQuery,
              queryIntent: hit.queryIntent,
              externalId: hit.externalId,
              url: hit.url,
              title: hit.title,
              description: hit.description,
              publishedAt: parseDate(hit.publishedAt),
              authorOrChannel: hit.authorOrChannel,
              rawJson: jsonInput(hit.rawJson),
              contentType: hit.contentType,
              ingestedAt: parseDate(hit.ingestedAt) ?? new Date()
            }
          });
        }

        for (const candidate of payload.candidates) {
          await tx.candidate.upsert({
            where: { id: candidate.id },
            update: {
              queryRunId: candidate.queryRunId,
              sourceHitId: candidate.sourceHitId,
              plannedQueryId: candidate.plannedQueryId,
              plannedQuery: candidate.plannedQuery,
              queryIntent: candidate.queryIntent,
              caseId: candidate.caseId,
              title: candidate.title,
              caseTitle: candidate.caseTitle,
              sourceName: candidate.sourceName,
              sourceType: candidate.sourceType,
              footageTypes: candidate.footageTypes,
              availabilityStatus: candidate.availabilityStatus,
              accessPath: candidate.accessPath,
              sourcingConfidence: candidate.sourcingConfidence,
              ethicalRisk: candidate.ethicalRisk,
              recommendedNextAction: candidate.recommendedNextAction,
              reviewDecision: candidate.reviewDecision,
              summary: candidate.summary,
              provenanceJson: jsonInput(candidate.provenance),
              scoreStatus: candidate.scoreStatus,
              scoreJson: jsonInput(candidate.score),
              overallPriorityScore: candidate.score.overallPriorityScore
            },
            create: {
              id: candidate.id,
              queryRunId: candidate.queryRunId,
              sourceHitId: candidate.sourceHitId,
              plannedQueryId: candidate.plannedQueryId,
              plannedQuery: candidate.plannedQuery,
              queryIntent: candidate.queryIntent,
              caseId: candidate.caseId,
              title: candidate.title,
              caseTitle: candidate.caseTitle,
              sourceName: candidate.sourceName,
              sourceType: candidate.sourceType,
              footageTypes: candidate.footageTypes,
              availabilityStatus: candidate.availabilityStatus,
              accessPath: candidate.accessPath,
              sourcingConfidence: candidate.sourcingConfidence,
              ethicalRisk: candidate.ethicalRisk,
              recommendedNextAction: candidate.recommendedNextAction,
              reviewDecision: candidate.reviewDecision,
              summary: candidate.summary,
              provenanceJson: jsonInput(candidate.provenance),
              scoreStatus: candidate.scoreStatus,
              scoreJson: jsonInput(candidate.score),
              overallPriorityScore: candidate.score.overallPriorityScore
            }
          });
        }
      });
    },

    async getSweep(id) {
      const row = await prisma.queryRun.findUnique({ where: { id } });
      return row ? queryRunFromRow(row) : null;
    },

    async listCandidates(filter = {}) {
      const rows = await prisma.candidate.findMany({
        where: filter.queryRunId ? { queryRunId: filter.queryRunId } : undefined,
        orderBy: { overallPriorityScore: "desc" }
      });
      return rows.map(candidateFromRow);
    },

    async getCandidate(id) {
      const row = await prisma.candidate.findUnique({ where: { id } });
      return row ? candidateFromRow(row) : null;
    },

    async reviewCandidate(id, review) {
      const existing = await prisma.candidate.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Candidate not found: ${id}`);
      }

      const row = await prisma.candidate.update({
        where: { id },
        data: { reviewDecision: review.decision }
      });

      await prisma.reviewDecision.create({
        data: {
          caseId: existing.caseId,
          sourceHitId: existing.sourceHitId,
          decision: review.decision,
          reason: review.reason,
          reviewer: review.reviewer
        }
      });

      return candidateFromRow(row);
    },

    async listCases() {
      const rows = await prisma.case.findMany({ orderBy: { canonicalTitle: "asc" } });
      return rows.map(caseFromRow);
    },

    async getCase(id) {
      const row = await prisma.case.findUnique({ where: { id } });
      return row ? caseFromRow(row) : null;
    },

    async listCaseCandidates(caseId) {
      const rows = await prisma.candidate.findMany({
        where: { caseId },
        orderBy: { overallPriorityScore: "desc" }
      });
      return rows.map(candidateFromRow);
    },

    async createRecordsRequestDraft(input, draftText, agencyName, agencyJurisdiction) {
      const row = await prisma.publicRecordsRequest.create({
        data: {
          caseId: input.caseId,
          agencyName,
          agencyJurisdiction,
          requestType: input.requestType,
          status: "draft",
          requestText: draftText
        }
      });

      return {
        id: row.id,
        caseId: row.caseId,
        agencyName: row.agencyName,
        agencyJurisdiction: row.agencyJurisdiction,
        requestType: row.requestType,
        status: "draft",
        requestText: row.requestText,
        submittedAt: row.submittedAt?.toISOString() ?? null,
        dueDate: row.dueDate?.toISOString() ?? null,
        feeEstimate: row.feeEstimate ? Number(row.feeEstimate) : null,
        externalUrl: row.externalUrl,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      };
    },

    async listRecordsRequests() {
      const rows = await prisma.publicRecordsRequest.findMany({ orderBy: { createdAt: "desc" } });
      return rows.map((row) => ({
        id: row.id,
        caseId: row.caseId,
        agencyName: row.agencyName,
        agencyJurisdiction: row.agencyJurisdiction,
        requestType: row.requestType,
        status: "draft",
        requestText: row.requestText,
        submittedAt: row.submittedAt?.toISOString() ?? null,
        dueDate: row.dueDate?.toISOString() ?? null,
        feeEstimate: row.feeEstimate ? Number(row.feeEstimate) : null,
        externalUrl: row.externalUrl,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      }));
    },

    async saveAiExtraction(input) {
      const candidate = await prisma.candidate.findFirst({
        where: {
          queryRunId: input.queryRunId,
          sourceHitId: input.sourceHit.id
        },
        select: { id: true, caseId: true }
      });

      await prisma.$transaction(async (tx) => {
        const aiRun = await tx.aiRun.create({
          data: {
            queryRunId: input.queryRunId,
            sourceHitId: input.sourceHit.id,
            taskType: input.result.taskType,
            provider: input.result.provider,
            model: input.result.model,
            status: input.result.status,
            inputJson: jsonInput({ sourceHit: input.sourceHit }),
            outputJson: jsonInput(input.result.output),
            error: input.result.error
          }
        });

        if (input.result.status !== "succeeded") return;

        for (const claim of input.result.output.claims) {
          await tx.evidenceClaim.create({
            data: {
              queryRunId: input.queryRunId,
              sourceHitId: input.sourceHit.id,
              candidateId: candidate?.id ?? null,
              caseId: candidate?.caseId ?? null,
              claimType: claim.type,
              text: claim.text,
              claimStatus: claim.status,
              provenanceJson: jsonInput(claim.provenance),
              createdByAiRunId: aiRun.id
            }
          });
        }
      });
    },

    async listCaseEvidenceClaims(caseId) {
      const rows = await prisma.evidenceClaim.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" }
      });
      return rows.map(evidenceClaimFromRow);
    }
  };
}
