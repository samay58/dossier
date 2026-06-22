# AI Research Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first AI-assisted research layer so source hits can produce structured, provenance-backed identifiers and claims without expanding the MVP into downloading, submission, PACER, transcript analysis, publishing, or autonomous research.

**Architecture:** Add a narrow shared schema and provider interface, then wire a mock provider into sweep persistence before adding a real OpenAI provider. AI outputs are stored as auditable JSON and consumed by dossiers as labeled claims, while deterministic code still owns guardrails, final scoring, and irreversible actions.

**Tech Stack:** Next.js, TypeScript, Prisma, Postgres, Vitest, OpenAI structured outputs behind `OPENAI_API_KEY`, existing connector and store abstractions.

**Status:** Implemented on 2026-06-22. The OpenAI provider uses `fetch` against the Responses API instead of adding an SDK dependency. The provider validates structured output before persistence, and missing `OPENAI_API_KEY` returns a skipped extraction result without breaking sweeps.

## Global Constraints

- Do not download YouTube or third-party platform videos.
- Do not submit records requests automatically.
- Do not automate PACER.
- Do not add transcript or video interrogation analysis.
- Do not publish or export unsupported claims.
- Missing `OPENAI_API_KEY` disables AI assistance, not the app.
- Every AI claim must include provenance or be rejected.
- AI-inferred claims cannot become `directly_supported_by_source`.
- Local demo must work from seeded data and mock AI output.
- Keep the UI restrained and light-mode.

---

## File Structure

- Create `packages/shared/src/ai-research.ts`: shared AI task types, schemas, validators, and mock extraction helpers.
- Create `packages/shared/src/ai-research.test.ts`: schema and guardrail tests.
- Modify `packages/shared/src/types.ts`: add AI run, extracted source packet, and claim types exported to web.
- Modify `packages/shared/src/index.ts`: export AI research module.
- Create `apps/web/lib/ai-research-provider.ts`: provider interface, mock provider, disabled provider, OpenAI provider boundary.
- Create `apps/web/lib/ai-research-provider.test.ts`: provider behavior tests with mocked model responses.
- Modify `prisma/schema.prisma`: add `AiRun` and `EvidenceClaim` models.
- Modify `prisma/migrations/20260622010000_init/migration.sql`: keep greenfield migration coherent.
- Modify `apps/web/lib/workbench-store.ts`: persist AI runs and evidence claims.
- Modify `apps/web/lib/repository.ts`: run mock or configured AI extraction after source-hit persistence path is ready.
- Modify `apps/web/app/cases/[id]/page.tsx`: show extracted identifiers and claim labels.
- Modify `apps/web/app/settings/page.tsx`: show AI provider enabled or disabled.
- Modify `docs/AI_ASSISTED_RESEARCH_PLAN.md`: update with implemented fields and decisions.
- Modify `docs/NEXT_STEPS.md`: mark the first AI layer as current baseline once complete.

---

### Task 1: Shared AI Research Schemas

**Files:**
- Create: `packages/shared/src/ai-research.ts`
- Create: `packages/shared/src/ai-research.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces:
  - `AiTaskType`
  - `EvidenceClaimType`
  - `EvidenceClaim`
  - `ExtractedSourcePacket`
  - `validateExtractedSourcePacket(value: unknown): { success: true; data: ExtractedSourcePacket } | { success: false; errors: string[] }`

- [ ] **Step 1: Write schema tests**

Create `packages/shared/src/ai-research.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateExtractedSourcePacket } from "./ai-research";

describe("AI research schemas", () => {
  it("accepts source-packet extraction with claim provenance", () => {
    const result = validateExtractedSourcePacket({
      people: [{ name: "David Creato", role: "defendant", provenance: [{ sourceHitId: "hit-1", field: "title" }] }],
      caseCaption: { value: "State v. David Creato", provenance: [{ sourceHitId: "hit-1", field: "title" }] },
      jurisdiction: null,
      courtOrAgency: null,
      docketNumber: null,
      caseNumber: null,
      eventDate: null,
      claims: [
        {
          type: "online_media_reference",
          text: "Title references a police interrogation reviewed at trial.",
          status: "reasonable_inference",
          provenance: [{ sourceHitId: "hit-1", field: "title" }]
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects claims without provenance", () => {
    const result = validateExtractedSourcePacket({
      people: [],
      caseCaption: null,
      jurisdiction: null,
      courtOrAgency: null,
      docketNumber: null,
      caseNumber: null,
      eventDate: null,
      claims: [
        {
          type: "online_media_reference",
          text: "Footage exists.",
          status: "reasonable_inference",
          provenance: []
        }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("claims[0].provenance must contain at least one source reference");
  });

  it("rejects AI direct support claims because direct support belongs to source parsing", () => {
    const result = validateExtractedSourcePacket({
      people: [],
      caseCaption: null,
      jurisdiction: null,
      courtOrAgency: null,
      docketNumber: null,
      caseNumber: null,
      eventDate: null,
      claims: [
        {
          type: "online_media_reference",
          text: "The title says interrogation video.",
          status: "directly_supported_by_source",
          provenance: [{ sourceHitId: "hit-1", field: "title" }]
        }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("AI extraction cannot emit directly_supported_by_source claims");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npx vitest run packages/shared/src/ai-research.test.ts
```

Expected: fails because `./ai-research` does not exist.

- [ ] **Step 3: Add shared schema implementation**

Create `packages/shared/src/ai-research.ts`:

```ts
import type { ClaimStatus } from "./types";

export type AiTaskType =
  | "source_packet_extraction"
  | "case_cluster_suggestion"
  | "query_plan_suggestion"
  | "dossier_explanation"
  | "records_draft_refinement";

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

export type EvidenceClaim = {
  type: EvidenceClaimType;
  text: string;
  status: Exclude<ClaimStatus, "directly_supported_by_source">;
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

type ValidationResult =
  | { success: true; data: ExtractedSourcePacket }
  | { success: false; errors: string[] };

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isReference(value: unknown): value is SourceFieldReference {
  const record = objectValue(value);
  return typeof record.sourceHitId === "string" && typeof record.field === "string";
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
      if (claimRecord.status === "directly_supported_by_source") {
        errors.push("AI extraction cannot emit directly_supported_by_source claims");
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
```

- [ ] **Step 4: Export module**

Modify `packages/shared/src/index.ts`:

```ts
export * from "./ai-research";
```

- [ ] **Step 5: Verify task**

Run:

```bash
npx vitest run packages/shared/src/ai-research.test.ts
npm run typecheck
```

Expected: both pass.

---

### Task 2: AI Provider Boundary

**Files:**
- Create: `apps/web/lib/ai-research-provider.ts`
- Create: `apps/web/lib/ai-research-provider.test.ts`
- Modify: `apps/web/lib/repository.ts`

**Interfaces:**
- Consumes: `ExtractedSourcePacket`, `SourceHit`, `validateExtractedSourcePacket`
- Produces:
  - `AiResearchProvider`
  - `createMockAiResearchProvider()`
  - `createDisabledAiResearchProvider()`
  - `createAiResearchProvider(options)`

- [ ] **Step 1: Write provider tests**

Create `apps/web/lib/ai-research-provider.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SourceHit } from "@interrogation/shared";
import { createAiResearchProvider, createDisabledAiResearchProvider, createMockAiResearchProvider } from "./ai-research-provider";

const sourceHit: SourceHit = {
  id: "hit-1",
  sourceId: "source-youtube",
  queryRunId: "run-1",
  plannedQueryId: "youtube-1",
  plannedQuery: "jury views interrogation video",
  queryIntent: "online_primary_media",
  sourceType: "youtube",
  sourceName: "YouTube Data API",
  externalId: "abc123",
  url: "https://www.youtube.com/watch?v=abc123",
  title: "David Creato Trial Jury Requests to Review Police Interrogation",
  description: "Trial coverage references a recorded police interrogation.",
  publishedAt: "2024-01-01T00:00:00.000Z",
  authorOrChannel: "Court Archive",
  rawJson: { snippet: { title: "David Creato Trial Jury Requests to Review Police Interrogation" } },
  contentType: "video",
  ingestedAt: "2026-06-22T00:00:00.000Z"
};

describe("AI research provider", () => {
  it("mock provider extracts source-packet claims with provenance", async () => {
    const provider = createMockAiResearchProvider();
    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("succeeded");
    expect(result.output.claims[0]?.provenance[0]).toEqual({ sourceHitId: "hit-1", field: "title" });
  });

  it("disabled provider returns skipped output without failing sweeps", async () => {
    const provider = createDisabledAiResearchProvider("OPENAI_API_KEY is not configured.");
    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("skipped");
    expect(result.output.claims).toHaveLength(0);
  });

  it("factory returns disabled provider when no key is configured", async () => {
    const provider = createAiResearchProvider({ env: {} });
    const result = await provider.extractSourcePacket({ sourceHit });

    expect(result.status).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npx vitest run apps/web/lib/ai-research-provider.test.ts
```

Expected: fails because provider file does not exist.

- [ ] **Step 3: Implement provider boundary**

Create `apps/web/lib/ai-research-provider.ts`:

```ts
import type { ExtractedSourcePacket, SourceHit } from "@interrogation/shared";
import { validateExtractedSourcePacket } from "@interrogation/shared";

export type AiExtractionInput = {
  sourceHit: SourceHit;
};

export type AiExtractionResult = {
  status: "succeeded" | "failed" | "skipped";
  provider: "mock" | "openai" | "disabled";
  model: string | null;
  output: ExtractedSourcePacket;
  error: string | null;
};

export type AiResearchProvider = {
  extractSourcePacket(input: AiExtractionInput): Promise<AiExtractionResult>;
};

const emptyPacket: ExtractedSourcePacket = {
  people: [],
  caseCaption: null,
  jurisdiction: null,
  courtOrAgency: null,
  docketNumber: null,
  caseNumber: null,
  eventDate: null,
  claims: []
};

function fieldRef(sourceHit: SourceHit, field: string) {
  return { sourceHitId: sourceHit.id, field };
}

export function createMockAiResearchProvider(): AiResearchProvider {
  return {
    async extractSourcePacket({ sourceHit }) {
      const packet: ExtractedSourcePacket = {
        ...emptyPacket,
        people: sourceHit.title.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/)
          ? [{ name: sourceHit.title.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/)![0], role: null, provenance: [fieldRef(sourceHit, "title")] }]
          : [],
        claims: [
          {
            type: sourceHit.sourceType === "muckrock" ? "public_records_path" : sourceHit.sourceType === "courtlistener" ? "court_recording_reference" : "online_media_reference",
            text: "AI extraction found a source-packet research lead from metadata.",
            status: "reasonable_inference",
            provenance: [fieldRef(sourceHit, "title")]
          }
        ]
      };
      const validation = validateExtractedSourcePacket(packet);

      return validation.success
        ? { status: "succeeded", provider: "mock", model: "mock-ai-research-v1", output: validation.data, error: null }
        : { status: "failed", provider: "mock", model: "mock-ai-research-v1", output: emptyPacket, error: validation.errors.join("; ") };
    }
  };
}

export function createDisabledAiResearchProvider(reason: string): AiResearchProvider {
  return {
    async extractSourcePacket() {
      return {
        status: "skipped",
        provider: "disabled",
        model: null,
        output: emptyPacket,
        error: reason
      };
    }
  };
}

export function createAiResearchProvider(options: { env: Record<string, string | undefined> }): AiResearchProvider {
  if (!options.env.OPENAI_API_KEY) {
    return createDisabledAiResearchProvider("OPENAI_API_KEY is not configured.");
  }

  return createMockAiResearchProvider();
}
```

- [ ] **Step 4: Verify task**

Run:

```bash
npx vitest run apps/web/lib/ai-research-provider.test.ts
npm run typecheck
```

Expected: both pass.

---

### Task 3: Persist AI Runs and Evidence Claims

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/20260622010000_init/migration.sql`
- Modify: `apps/web/lib/workbench-store.ts`
- Modify: `apps/web/lib/workbench-store.prisma.test.ts`

**Interfaces:**
- Consumes: `AiExtractionResult`, `EvidenceClaim`
- Produces:
  - `saveAiExtraction(input)`
  - persisted `ai_runs`
  - persisted `evidence_claims`

- [ ] **Step 1: Add Prisma test expectations**

Extend `apps/web/lib/workbench-store.prisma.test.ts` with assertions that after saving AI extraction:

```ts
const aiRunCount = await prisma.aiRun.count();
const claimCount = await prisma.evidenceClaim.count();
expect(aiRunCount).toBeGreaterThan(0);
expect(claimCount).toBeGreaterThan(0);
```

Expected initial result: typecheck fails until models and store methods exist.

- [ ] **Step 2: Add Prisma models**

Add to `prisma/schema.prisma`:

```prisma
enum AiRunStatus {
  succeeded
  failed
  skipped
}

enum EvidenceClaimType {
  online_media_reference
  court_recording_reference
  public_records_path
  commentary_or_recap
  ethical_restriction
}

model AiRun {
  id          String      @id @default(uuid())
  queryRunId  String?
  sourceHitId String?
  taskType    String
  provider    String
  model       String?
  status      AiRunStatus
  inputJson   Json
  outputJson  Json
  error       String?
  createdAt   DateTime    @default(now())
  sourceHit   SourceHit?   @relation(fields: [sourceHitId], references: [id], onDelete: SetNull)

  @@index([queryRunId])
  @@index([sourceHitId])
  @@map("ai_runs")
}

model EvidenceClaim {
  id             String            @id @default(uuid())
  queryRunId     String
  sourceHitId    String
  candidateId    String?
  caseId         String?
  claimType      EvidenceClaimType
  text           String
  claimStatus    String
  provenanceJson Json
  createdByAiRunId String?
  createdAt      DateTime          @default(now())
  sourceHit      SourceHit         @relation(fields: [sourceHitId], references: [id], onDelete: Cascade)

  @@index([queryRunId])
  @@index([sourceHitId])
  @@index([caseId])
  @@map("evidence_claims")
}
```

Also add reverse relations on `SourceHit`:

```prisma
aiRuns        AiRun[]
evidenceClaims EvidenceClaim[]
```

- [ ] **Step 3: Update migration**

Mirror the schema additions in `prisma/migrations/20260622010000_init/migration.sql` because the repo is still greenfield.

- [ ] **Step 4: Add store method**

Extend `WorkbenchStore` in `apps/web/lib/workbench-store.ts`:

```ts
saveAiExtraction(input: {
  queryRunId: string;
  sourceHit: SourceHit;
  result: AiExtractionResult;
}): Promise<void>;
```

Memory store should retain runs and claims in local arrays. Prisma store should create one `ai_runs` row and one `evidence_claims` row per extracted claim.

- [ ] **Step 5: Verify task**

Run:

```bash
npm run db:generate
npm run typecheck
RUN_PRISMA_TESTS=1 DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npx vitest run apps/web/lib/workbench-store.prisma.test.ts
```

Expected: all pass.

---

### Task 4: Run AI Extraction During Sweeps

**Files:**
- Modify: `apps/web/lib/repository.ts`
- Modify: `apps/web/lib/repository.test.ts`
- Modify: `apps/web/app/api/settings/route.ts` or `apps/web/lib/repository.ts` settings output

**Interfaces:**
- Consumes: `createAiResearchProvider`, `saveAiExtraction`
- Produces: source-hit AI extraction after sweep collection

- [ ] **Step 1: Add repository test**

Add a repository test:

```ts
it("runs mock AI extraction for live hits without changing metadata truth status", async () => {
  const repository = createWorkbenchRepository({
    env: {
      YOUTUBE_DATA_API_KEY: "test-youtube-key",
      OPENAI_API_KEY: "test-openai-key"
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: { videoId: "ai-extraction-video" },
            snippet: {
              title: "David Creato Trial Jury Requests to Review Police Interrogation",
              description: "Trial coverage references a recorded police interrogation.",
              channelTitle: "Court Archive",
              publishedAt: "2024-05-01T00:00:00Z"
            }
          }
        ]
      })
    })
  });

  const sweep = await repository.runSweep({
    query: "jury views interrogation video",
    queryFamily: "court_media",
    sources: ["youtube"]
  });

  const candidates = await repository.listCandidates({ queryRunId: sweep.id });
  expect(candidates[0]?.scoreStatus).toBe("provisional_metadata");
});
```

- [ ] **Step 2: Wire provider through repository options**

Extend `RepositoryOptions`:

```ts
aiProvider?: AiResearchProvider;
```

Default to `createAiResearchProvider({ env })`.

- [ ] **Step 3: Run extraction after live hit collection**

In `runSweep`, after `sourceHits` is assembled and before returning:

```ts
await Promise.all(
  liveHits.map((sourceHit) =>
    store.saveAiExtraction({
      queryRunId: runId,
      sourceHit,
      result: await aiProvider.extractSourcePacket({ sourceHit })
    })
  )
);
```

Use a small helper if needed to avoid inline `await` inside object literal.

- [ ] **Step 4: Add AI setting status**

Settings should show AI assistance enabled when `OPENAI_API_KEY` exists and disabled otherwise.

- [ ] **Step 5: Verify task**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

---

### Task 5: Dossier Claim Display

**Files:**
- Modify: `apps/web/lib/workbench-store.ts`
- Modify: `apps/web/lib/repository.ts`
- Modify: `apps/web/app/cases/[id]/page.tsx`

**Interfaces:**
- Consumes: persisted evidence claims
- Produces:
  - `listCaseEvidenceClaims(caseId: string)`
  - dossier evidence section with claim status labels

- [ ] **Step 1: Add store/repository method**

Add:

```ts
listCaseEvidenceClaims(caseId: string): Promise<EvidenceClaim[]>;
```

Memory implementation can filter stored claims by `caseId`. Prisma implementation should query `evidence_claims`.

- [ ] **Step 2: Display claims in dossier**

In `apps/web/app/cases/[id]/page.tsx`, add a small panel:

```tsx
<Panel>
  <h2 className="font-serif text-2xl font-semibold">Extracted claims</h2>
  <div className="mt-4 grid gap-3">
    {claims.map((claim) => (
      <div key={claim.id} className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">{claim.text}</div>
          <Badge tone={claim.claimStatus === "reasonable_inference" ? "warn" : "neutral"}>
            {claim.claimStatus.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>
    ))}
  </div>
</Panel>
```

- [ ] **Step 3: Empty state**

If no claims exist, show restrained copy:

```tsx
<p className="mt-3 text-sm text-muted-foreground">No AI extraction has run for this case yet.</p>
```

- [ ] **Step 4: Verify task**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

---

### Task 6: Live Smoke and Docs

**Files:**
- Modify: `docs/AI_ASSISTED_RESEARCH_PLAN.md`
- Modify: `docs/NEXT_STEPS.md`

**Interfaces:**
- Consumes: implemented AI extraction layer
- Produces: updated canonical roadmap and evidence of smoke results

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run db:generate
docker compose up -d
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npm run db:push
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npm run db:seed
RUN_PRISMA_TESTS=1 DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npx vitest run apps/web/lib/workbench-store.prisma.test.ts
```

- [ ] **Step 2: Run live smoke**

Start a fresh dev server after build:

```bash
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npm run dev
```

Then:

```bash
curl -sS -X POST http://localhost:3000/api/sweeps \
  -H 'Content-Type: application/json' \
  --data '{"query":"jury views interrogation video","queryFamily":"court_media","sources":["seed","youtube","courtlistener","muckrock"]}'
```

Acceptance:

- Sweep succeeds.
- Seed still works without AI.
- Missing `OPENAI_API_KEY` disables AI assistance without breaking the sweep.
- With `OPENAI_API_KEY`, AI extraction rows are stored.
- Dossier shows extracted claims as inferred or needs-review, not verified source facts.

- [ ] **Step 3: Update docs**

Update `docs/NEXT_STEPS.md`:

- Move AI source-packet extraction from active plan to current baseline.
- Make claim model and case resolution the next active priority.

Update `docs/AI_ASSISTED_RESEARCH_PLAN.md`:

- Record implemented provider shape.
- Record any intentional deferrals.

- [ ] **Step 4: Final status**

Run:

```bash
git status --short
```

Summarize changed files by purpose. Do not commit unless explicitly asked.
