import {
  createSeedSweep,
  createQueryPlan,
  generateRecordsRequestDraft,
  courtListenerConnector,
  muckRockConnector,
  youtubeConnector,
  type CaseCluster,
  type NormalizedCandidate,
  type QueryRun,
  type ReviewDecision,
  type SeedSweep,
  type SourceHit
} from "@interrogation/shared";
import { createAiResearchProvider, type AiResearchProvider } from "./ai-research-provider";
import { candidateFromHit } from "./candidate-normalization";
import {
  createMemoryWorkbenchStore,
  createPrismaWorkbenchStore,
  type CandidateListFilter,
  type WorkbenchStore
} from "./workbench-store";

export type RunSweepInput = {
  query: string;
  queryFamily: string;
  sources: string[];
};

export type CandidateReviewInput = {
  decision: ReviewDecision;
  reason: string;
  reviewer: string;
};

export type RecordsRequestInput = {
  caseId: string;
  requestType: "state_public_records" | "foia" | "court_clerk" | "media_license" | "other";
  feeCapDollars: number;
};

export type StoredRecordsRequest = {
  id: string;
  caseId: string;
  agencyName: string;
  agencyJurisdiction: string;
  requestType: RecordsRequestInput["requestType"];
  status: "draft";
  requestText: string;
  submittedAt: string | null;
  dueDate: string | null;
  feeEstimate: number | null;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationStatus = {
  enabled: boolean;
  reason: string;
};

export type WorkbenchSettings = {
  integrations: {
    youtube: IntegrationStatus;
    courtlistener: IntegrationStatus;
    muckrock: IntegrationStatus;
    documentcloud: IntegrationStatus;
  };
  ai: IntegrationStatus;
  guardrails: {
    automaticVideoDownloading: false;
    automaticRecordsSubmission: false;
    unsupportedClaimPublishing: false;
  };
};

type RepositoryOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: Parameters<typeof youtubeConnector.search>[0]["fetchImpl"];
  store?: WorkbenchStore;
  aiProvider?: AiResearchProvider;
};

type SourceResult = NonNullable<QueryRun["sourceResults"]>[number];
type CandidatePair = ReturnType<typeof candidateFromHit>;

function defendantFromCase(caseRecord: CaseCluster): string {
  const match = caseRecord.canonicalTitle.match(/\bv\.\s+(.+)$/i);
  return match?.[1] ?? caseRecord.canonicalTitle;
}

function integrationStatus(env: Record<string, string | undefined>, key: string): IntegrationStatus {
  return env[key]
    ? { enabled: true, reason: `${key} is configured.` }
    : { enabled: false, reason: `${key} is not configured. Seed fixtures remain available.` };
}

function muckRockStatus(env: Record<string, string | undefined>): IntegrationStatus {
  if (muckRockConnector.isEnabled(env)) {
    return { enabled: true, reason: "MuckRock credentials are configured." };
  }

  return {
    enabled: false,
    reason: "MUCKROCK_API_TOKEN, MUCKROCK_ACCESS_TOKEN, or MUCKROCK_USERNAME and MUCKROCK_PASSWORD are not configured. Seed fixtures remain available."
  };
}

function documentCloudStatus(env: Record<string, string | undefined>): IntegrationStatus {
  return env.DOCUMENTCLOUD_USERNAME && env.DOCUMENTCLOUD_PASSWORD
    ? { enabled: true, reason: "DocumentCloud credentials are configured." }
    : { enabled: false, reason: "DOCUMENTCLOUD_USERNAME and DOCUMENTCLOUD_PASSWORD are not configured. Seed fixtures remain available." };
}

function aiStatus(env: Record<string, string | undefined>): IntegrationStatus {
  return env.OPENAI_API_KEY
    ? { enabled: true, reason: `OPENAI_API_KEY is configured. Using ${env.OPENAI_RESEARCH_MODEL ?? "gpt-4.1-mini"} for source-packet extraction.` }
    : { enabled: false, reason: "OPENAI_API_KEY is not configured. Sweeps continue without AI extraction." };
}

function queryRunId(): string {
  return `query-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sourceHitDedupeKey(hit: SourceHit): string {
  return `${hit.sourceId}:${hit.externalId ?? hit.url}`;
}

function uniqueCandidatePairsFromHits(hits: SourceHit[]): CandidatePair[] {
  const pairs = new Map<string, CandidatePair>();
  for (const hit of hits) {
    const key = sourceHitDedupeKey(hit);
    if (!pairs.has(key)) {
      pairs.set(key, candidateFromHit(hit));
    }
  }
  return [...pairs.values()];
}

export function createWorkbenchRepository(options: RepositoryOptions = {}) {
  const store = options.store ?? createMemoryWorkbenchStore();
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl;
  const aiProvider = options.aiProvider ?? createAiResearchProvider({ env });

  async function saveAiExtractionForHits(queryRunId: string, hits: SourceHit[]) {
    await Promise.all(hits.map(async (sourceHit) => {
      try {
        const result = await aiProvider.extractSourcePacket({ sourceHit });
        await store.saveAiExtraction({ queryRunId, sourceHit, result });
      } catch (error) {
        await store.saveAiExtraction({
          queryRunId,
          sourceHit,
          result: {
            taskType: "source_packet_extraction",
            status: "failed",
            provider: "disabled",
            model: null,
            output: {
              people: [],
              caseCaption: null,
              jurisdiction: null,
              courtOrAgency: null,
              docketNumber: null,
              caseNumber: null,
              eventDate: null,
              claims: []
            },
            error: error instanceof Error ? error.message : "AI extraction failed"
          }
        }).catch(() => undefined);
      }
    }));
  }

  return {
    async runSweep(input: RunSweepInput): Promise<QueryRun> {
      const selectedSources = input.sources.length ? input.sources : ["seed"];
      const runId = queryRunId();
      const queryPlan = createQueryPlan({
        originalQuery: input.query,
        family: input.queryFamily,
        sources: selectedSources,
        maxQueriesPerSource: 3
      });
      const availableConnectors = [
        youtubeConnector,
        courtListenerConnector,
        muckRockConnector
      ].filter((connector) => selectedSources.includes(connector.id));
      const liveResults = await Promise.all(
        availableConnectors.map(async (connector): Promise<{ sourceResult: SourceResult; hits: SourceHit[] }> => {
          const plannedQueries = queryPlan.plannedQueries.filter((plannedQuery) => plannedQuery.source === connector.id);
          if (!connector.isEnabled(env)) {
            return {
              sourceResult: {
                source: connector.id,
                status: "skipped",
                resultCount: 0,
                error: "Credentials are not configured"
              },
              hits: []
            };
          }

          if (!plannedQueries.length) {
            return {
              sourceResult: {
                source: connector.id,
                status: "skipped",
                resultCount: 0,
                error: "No planned queries for source"
              },
              hits: []
            };
          }

          try {
            const settled = await Promise.allSettled(
              plannedQueries.map((plannedQuery) =>
                connector.search({ query: plannedQuery.query, queryRunId: runId, env, fetchImpl, plannedQuery })
              )
            );
            const hits = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
            const errors = settled
              .filter((result): result is PromiseRejectedResult => result.status === "rejected")
              .map((result) => result.reason instanceof Error ? result.reason.message : "Planned query failed");
            return {
              sourceResult: {
                source: connector.id,
                status: errors.length ? "failed" : "succeeded",
                resultCount: hits.length,
                error: errors.length ? errors.join("; ") : undefined
              },
              hits
            };
          } catch (error) {
            return {
              sourceResult: {
                source: connector.id,
                status: "failed",
                resultCount: 0,
                error: error instanceof Error ? error.message : "Connector failed"
              },
              hits: []
            };
          }
        })
      );
      const liveHits = liveResults.flatMap((result) => result.hits);
      const livePairs = uniqueCandidatePairsFromHits(liveHits);
      const seedSweep: SeedSweep | null = selectedSources.includes("seed") ? createSeedSweep(input.query, runId) : null;
      const seedSourceHits = seedSweep?.sourceHits ?? [];
      const seedCandidates = seedSweep?.candidates ?? [];
      const sourceResults: SourceResult[] = [
        ...(seedSweep
          ? [
              {
                source: "seed",
                status: "succeeded" as const,
                resultCount: seedSourceHits.length
              }
            ]
          : []),
        ...liveResults.map((result) => result.sourceResult)
      ];
      const sourceHits = [...seedSourceHits, ...liveHits];
      const cases = [...(seedSweep?.cases ?? []), ...livePairs.map((pair) => pair.caseRecord)];
      const candidates = [...seedCandidates, ...livePairs.map((pair) => pair.candidate)];
      const now = new Date().toISOString();
      const queryRun: QueryRun = {
        id: runId,
        sourceId: selectedSources.includes("seed") ? seedSweep?.queryRun.sourceId ?? "source-seed-demo" : "source-live",
        query: input.query,
        queryFamily: input.queryFamily,
        status: "succeeded",
        startedAt: now,
        finishedAt: now,
        resultCount: sourceHits.length,
        error: sourceResults.some((result) => result.status === "failed") ? "One or more sources failed" : null,
        queryPlan,
        sourceResults
      };

      await store.saveSweep({ queryRun, sourceHits, cases, candidates });
      await saveAiExtractionForHits(runId, liveHits);
      return queryRun;
    },

    async getSweep(id: string): Promise<QueryRun | null> {
      return store.getSweep(id);
    },

    async listCandidates(filter?: CandidateListFilter): Promise<NormalizedCandidate[]> {
      return store.listCandidates(filter);
    },

    async getCandidate(id: string): Promise<NormalizedCandidate | null> {
      return store.getCandidate(id);
    },

    async reviewCandidate(id: string, review: CandidateReviewInput): Promise<NormalizedCandidate> {
      return store.reviewCandidate(id, review);
    },

    async listCases(): Promise<CaseCluster[]> {
      return store.listCases();
    },

    async getCase(id: string): Promise<CaseCluster | null> {
      return store.getCase(id);
    },

    async listCaseCandidates(caseId: string): Promise<NormalizedCandidate[]> {
      return store.listCaseCandidates(caseId);
    },

    async listCaseEvidenceClaims(caseId: string) {
      return store.listCaseEvidenceClaims(caseId);
    },

    async createRecordsRequestDraft(input: RecordsRequestInput): Promise<StoredRecordsRequest> {
      const caseRecord = await store.getCase(input.caseId);
      if (!caseRecord) {
        throw new Error(`Case not found: ${input.caseId}`);
      }

      const agencyName = caseRecord.agencyName ?? "Unknown agency";
      const agencyJurisdiction = caseRecord.jurisdiction ?? caseRecord.state ?? "Unknown jurisdiction";
      const draft = generateRecordsRequestDraft({
        requestType: input.requestType,
        caseName: caseRecord.canonicalTitle,
        defendantName: defendantFromCase(caseRecord),
        agencyName,
        agencyJurisdiction,
        courtName: caseRecord.courtName ?? undefined,
        incidentNumber: caseRecord.incidentNumber ?? undefined,
        caseNumber: caseRecord.courtCaseNumber ?? undefined,
        feeCapDollars: input.feeCapDollars
      });

      return store.createRecordsRequestDraft(input, draft.body, agencyName, agencyJurisdiction);
    },

    async listRecordsRequests(): Promise<StoredRecordsRequest[]> {
      return store.listRecordsRequests();
    },

    getSettings(): WorkbenchSettings {
      return {
        integrations: {
          youtube: integrationStatus(env, "YOUTUBE_DATA_API_KEY"),
          courtlistener: integrationStatus(env, "COURTLISTENER_API_TOKEN"),
          muckrock: muckRockStatus(env),
          documentcloud: documentCloudStatus(env)
        },
        ai: aiStatus(env),
        guardrails: {
          automaticVideoDownloading: false,
          automaticRecordsSubmission: false,
          unsupportedClaimPublishing: false
        }
      };
    }
  };
}

const globalForRepository = globalThis as unknown as {
  workbenchRepository?: ReturnType<typeof createWorkbenchRepository>;
};

export function getWorkbenchRepository() {
  globalForRepository.workbenchRepository ??= createWorkbenchRepository({
    store: process.env.DATABASE_URL ? createPrismaWorkbenchStore() : createMemoryWorkbenchStore()
  });
  return globalForRepository.workbenchRepository;
}
