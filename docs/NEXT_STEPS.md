# Intelligent Next Steps

Last updated: 2026-06-22

This is the canonical living roadmap. Supporting detail lives in:

- `docs/AI_ASSISTED_RESEARCH_PLAN.md`
- `docs/QUERY_STRATEGY_PLAN.md`
- `docs/ADVERSARIAL_REVIEW_2026-06-22.md`
- `docs/superpowers/plans/2026-06-22-ai-research-layer.md`

## Current Baseline

The workbench now has a real MVP:

- Seed, YouTube, CourtListener, and MuckRock sweeps run through connector interfaces.
- Sweeps, source hits, cases, candidates, reviews, and records-request drafts persist in Postgres through Prisma.
- Candidate lists can be scoped to a single query run.
- Repeated live sweeps preserve duplicate external hits as separate run evidence instead of crashing.
- Sweeps build a deterministic source-aware query plan, run source-specific planned queries, and tag each live hit and candidate with query origin.
- Live connector candidates stay `provisional_metadata` until a human verifies the source packet.
- Live source hits can run source-packet extraction through an `AiResearchProvider` boundary.
- Missing `OPENAI_API_KEY` disables AI assistance without breaking sweeps.
- AI task inputs and outputs persist in `ai_runs`; extracted claims persist in `evidence_claims`.
- Dossiers show AI claims as inferred, needs review, or unsupported. AI cannot emit `directly_supported_by_source`.
- Records requests remain drafts.

The latest live smoke for `jury views interrogation video` proved:

- Seed returned 5 hits.
- YouTube returned 30 hits from 3 planned media queries.
- CourtListener returned 60 hits from 3 planned legal-record queries.
- MuckRock returned 30 hits from 3 planned public-records queries.
- The scoped candidate queue returned 12 candidates after same-run candidate dedupe.
- Every scoped candidate had provenance.
- Every live candidate had planned-query origin.
- Seed fixture candidates stayed source-supported and were not mislabeled as live planned-query results.

## Conviction

The next build should be AI-assisted evidence extraction and case resolution.

The bottleneck is no longer connector plumbing. It is understanding what each source hit means, linking related hits into one dossier, and preserving claim-level truthfulness while using AI to move faster.

Do not build another broad connector yet. Do not build a chat interface. Do not build transcript/video analysis. Do not add an autonomous agent. The right next layer is a structured AI research analyst with citations, behind a provider boundary, with deterministic code owning guardrails and final actions.

## Product Principle

AI should be heavily used for:

- Extracting identifiers from source packets.
- Separating source-supported facts from inference.
- Suggesting case merges across YouTube, CourtListener, and MuckRock.
- Explaining why a dossier matters.
- Suggesting better source-specific query variants.
- Refining draft records-request wording.

AI must not:

- Download videos.
- Submit public-records requests.
- Automate PACER.
- Diagnose people.
- Score body language.
- Publish unsupported claims.
- Silently upgrade metadata-only evidence into verified fact.
- Own opaque final ranking.

## Active Plan

### Priority 1: Claim Model and Evidence Graph

Build this next.

Why:

The first AI layer now stores auditable extraction runs and provenance-backed evidence claims. The next step is making those claims the durable center of dossier truth instead of leaving candidate scoring, source facts, and inferred classification mixed together.

What to build:

- Define claim records for facts and inferences:
  - footage exists
  - footage appears online
  - court record references a recording
  - public-records path exists
  - source appears to be commentary or recap
  - ethical restriction may apply
- Store claim status:
  - `directly_supported_by_source`
  - `reasonable_inference`
  - `speculative`
  - `unsupported`
- Link each claim to source hit, source field, candidate, and case.
- Let deterministic source parsing or human review create `directly_supported_by_source` claims.
- Keep AI claims limited to inference statuses.

Done means:

- The dossier can answer "what do we know?" and "why do we believe it?" without treating title matches as fact.
- Candidate scoring can reference stored claims instead of reparsing raw titles.
- Source-supported and AI-inferred claims are visually distinct.

### Priority 2: AI-Assisted Case Resolution

Build this after claim statuses are driving dossiers cleanly.

Why:

The product becomes genuinely integrated when one case dossier combines YouTube media leads, CourtListener legal references, and MuckRock records paths. Right now, case creation is still title-driven and too shallow.

What to build:

- Suggest case merges from extracted identifiers.
- Use docket number and case caption as strongest signals.
- Use defendant plus jurisdiction as a medium-confidence signal.
- Use fuzzy source-title similarity only as weak support.
- Store suggested merges with confidence, evidence for merge, and evidence against merge.
- Keep ambiguous merges human-reviewable.

Done means:

- Related hits can land in one dossier.
- AI can suggest merges, but code or human review applies them.
- The UI shows why a merge is suggested.
- No ambiguous merge happens silently.

### Priority 3: Source-Specific Enrichment

Build this after the extraction and merge path exists.

Why:

Enrichment is expensive and can sprawl. It should be targeted at promising leads, not every result.

What to build:

- YouTube:
  - Extract channel trust signals.
  - Distinguish Court TV, Law&Crime, official channels, local news, commentary, reposts, and recaps.
  - Keep media metadata provisional.
- CourtListener:
  - Enrich top leads with docket or opinion context when snippets mention suppression, Miranda, exhibits, recorded statements, or jury viewing.
  - Prefer RECAP paths before any paid-retrieval thinking.
- MuckRock:
  - Hydrate agency and request details only for promising records leads.
  - Preserve numeric agency and requester IDs when expanded data is not available.

Done means:

- Enrichment improves ranking or case resolution.
- It does not create broad scraping.
- It does not add PACER automation.

### Priority 4: AI Query Strategy Feedback Loop

Build this after enough sweep/review data exists.

Why:

The deterministic planner is intentionally small. AI should help discover better query language, but accepted suggestions should become deterministic planner rules or settings.

What to build:

- Analyze planned-query results after a sweep.
- Identify high-yield and noisy planned queries.
- Suggest source-specific additions, removals, and rewrites.
- Require human acceptance before changing planner behavior.

Done means:

- AI helps the search strategy evolve.
- Live sweeps remain explainable.
- No AI-generated query runs automatically in the MVP.

### Priority 5: Review Feedback Calibration

Build this once there is enough human review signal.

Why:

The ranking should improve from Samay's actual research choices, but stay inspectable.

What to build:

- Capture review reason categories.
- Map review decisions to deterministic scoring/routing adjustments.
- Record when a scoring rule changes and why.
- Keep AI as explanation or suggestion, not final scoring authority.

Done means:

- Review decisions change future behavior through clear rules.
- The queue gets sharper without becoming an opaque model ranking.

### Priority 6: Placeholder Surface Cleanup

Do this as a narrow reliability pass.

Why:

Guardrail-critical 501 routes are useful. Placeholder routes with no UI path, no tests, and no guardrail value make the app look wider than it is.

What to build:

- Keep explicit no-op guardrails for:
  - no transcription
  - no interrogation analysis
  - no media storage
  - no automatic request submission
- Remove or hide routes that only advertise future scope.
- Update docs and tests.

Done means:

- The API contract matches the MVP.
- Future-scope routes only exist when they protect a guardrail.

## Files To Touch Next

Next implementation pass:

- Modify `packages/shared/src/ai-research.ts`
- Modify `apps/web/lib/workbench-store.ts`
- Modify `apps/web/lib/repository.ts`
- Modify `apps/web/lib/candidate-normalization.ts` only where needed to consume extracted identifiers
- Modify `apps/web/app/cases/[id]/page.tsx`
- Add focused tests for claim status, claim-based scoring inputs, and source-supported claim creation.

Avoid touching:

- Transcript pages and transcript API routes.
- Media storage routes.
- Records-request submission routes.
- PACER-related schema beyond existing inert enums.

## Verification Standard

Every pass should run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run db:generate
```

When the Prisma schema changes:

```bash
docker compose up -d
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npm run db:push
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npm run db:seed
RUN_PRISMA_TESTS=1 DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npx vitest run apps/web/lib/workbench-store.prisma.test.ts
```

Live smoke when credentials are configured:

```bash
curl -sS -X POST http://localhost:3000/api/sweeps \
  -H 'Content-Type: application/json' \
  --data '{"query":"jury views interrogation video","queryFamily":"court_media","sources":["seed","youtube","courtlistener","muckrock"]}'
```

Acceptance checks:

- Sweeps still work with no external API keys using seed fixtures.
- Missing `OPENAI_API_KEY` disables AI assistance, not the app.
- AI outputs are schema-validated before persistence.
- Every AI claim has provenance.
- Live metadata remains provisional.
- Records requests remain drafts.
- No forbidden workflow is introduced.

## Deferred On Purpose

- Automatic video downloading.
- Automatic public-records submission.
- PACER automation.
- Transcript workbench.
- Video or transcript interrogation analysis.
- Publishing/export workflows.
- Multi-user collaboration.
- Chat-style research agent UI.
