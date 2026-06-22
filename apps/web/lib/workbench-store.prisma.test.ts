import { PrismaClient } from "@prisma/client";
import { createSeedSweep } from "@interrogation/shared";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaWorkbenchStore } from "./workbench-store";

const runPrismaTests = process.env.RUN_PRISMA_TESTS === "1" && Boolean(process.env.DATABASE_URL);
const describePrisma = runPrismaTests ? describe : describe.skip;

let prisma: PrismaClient | null = null;

async function cleanDatabase(client: PrismaClient) {
  await client.evidenceClaim.deleteMany();
  await client.aiRun.deleteMany();
  await client.reviewDecision.deleteMany();
  await client.publicRecordsRequest.deleteMany();
  await client.candidateScore.deleteMany();
  await client.candidate.deleteMany();
  await client.document.deleteMany();
  await client.mediaAsset.deleteMany();
  await client.casePerson.deleteMany();
  await client.sourceHit.deleteMany();
  await client.queryRun.deleteMany();
  await client.case.deleteMany();
  await client.source.deleteMany();
}

describePrisma("Prisma workbench store", () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("persists repeated external hits, scoped candidates, AI claims, reviews, and draft requests", async () => {
    prisma = new PrismaClient();
    await cleanDatabase(prisma);

    const firstSweep = createSeedSweep("jury views interrogation video", "query-run-prisma-smoke-a");
    const secondSweep = createSeedSweep("jury views interrogation video", "query-run-prisma-smoke-b");
    const firstStore = createPrismaWorkbenchStore(prisma);

    await firstStore.saveSweep(firstSweep);
    await firstStore.saveSweep(secondSweep);

    const firstCandidates = await firstStore.listCandidates({ queryRunId: firstSweep.queryRun.id });
    const secondCandidates = await firstStore.listCandidates({ queryRunId: secondSweep.queryRun.id });
    const allCandidates = await firstStore.listCandidates();

    expect(firstCandidates).toHaveLength(5);
    expect(secondCandidates).toHaveLength(5);
    expect(allCandidates).toHaveLength(10);
    expect(firstCandidates.every((candidate) => candidate.queryRunId === firstSweep.queryRun.id)).toBe(true);
    expect(secondCandidates.every((candidate) => candidate.queryRunId === secondSweep.queryRun.id)).toBe(true);

    const reviewed = await firstStore.reviewCandidate(firstCandidates[0]!.id, {
      decision: "request_footage",
      reason: "Need source exhibit procedure before watch queue.",
      reviewer: "prisma-smoke"
    });
    await firstStore.saveAiExtraction({
      queryRunId: firstSweep.queryRun.id,
      sourceHit: firstSweep.sourceHits[0]!,
      result: {
        taskType: "source_packet_extraction",
        status: "succeeded",
        provider: "mock",
        model: "mock-ai-research-v1",
        output: {
          people: [{ name: "David Creato", role: null, provenance: [{ sourceHitId: firstSweep.sourceHits[0]!.id, field: "title" }] }],
          caseCaption: null,
          jurisdiction: null,
          courtOrAgency: null,
          docketNumber: null,
          caseNumber: null,
          eventDate: null,
          claims: [
            {
              type: "online_media_reference",
              text: "Metadata references a recorded interrogation lead.",
              status: "reasonable_inference",
              provenance: [{ sourceHitId: firstSweep.sourceHits[0]!.id, field: "title" }]
            }
          ]
        },
        error: null
      }
    });

    const request = await firstStore.createRecordsRequestDraft(
      {
        caseId: firstSweep.cases[0]!.id,
        requestType: "court_clerk",
        feeCapDollars: 25
      },
      "Draft only. Do not submit automatically.",
      "Osceola County Sheriff Office",
      "Florida"
    );
    expect(await prisma.aiRun.count()).toBeGreaterThan(0);
    expect(await prisma.evidenceClaim.count()).toBeGreaterThan(0);

    await prisma.$disconnect();
    prisma = new PrismaClient();
    const restartedStore = createPrismaWorkbenchStore(prisma);

    const persistedReviewed = await restartedStore.getCandidate(reviewed.id);
    const persistedFirstCandidates = await restartedStore.listCandidates({ queryRunId: firstSweep.queryRun.id });
    const persistedSecondCandidates = await restartedStore.listCandidates({ queryRunId: secondSweep.queryRun.id });
    const persistedRequests = await restartedStore.listRecordsRequests();
    const persistedClaims = await restartedStore.listCaseEvidenceClaims(firstCandidates[0]!.caseId);

    expect(persistedReviewed?.reviewDecision).toBe("request_footage");
    expect(persistedFirstCandidates).toHaveLength(5);
    expect(persistedSecondCandidates).toHaveLength(5);
    expect(persistedRequests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: request.id,
        status: "draft",
        submittedAt: null,
        requestText: "Draft only. Do not submit automatically."
      })
    ]));
    expect(persistedClaims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: "Metadata references a recorded interrogation lead.",
        claimStatus: "reasonable_inference",
        provenance: [{ sourceHitId: firstSweep.sourceHits[0]!.id, field: "title" }]
      })
    ]));
  });
});
