import { PrismaClient } from "@prisma/client";
import { createSeedSweep } from "@interrogation/shared";
import { createPrismaWorkbenchStore } from "../apps/web/lib/workbench-store";

const prisma = new PrismaClient();
const store = createPrismaWorkbenchStore(prisma);

const sweep = createSeedSweep("jury views interrogation video", "query-run-seed-demo");
await store.saveSweep({
  queryRun: sweep.queryRun,
  sourceHits: sweep.sourceHits,
  cases: sweep.cases,
  candidates: sweep.candidates
});

await prisma.$disconnect();

console.log(JSON.stringify({
  seeded: true,
  queryRunId: sweep.queryRun.id,
  sourceHits: sweep.sourceHits.length,
  cases: sweep.cases.length,
  candidates: sweep.candidates.length
}, null, 2));
