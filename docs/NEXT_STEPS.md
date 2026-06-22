# Dossier Master Plan

Last updated: 2026-06-22

This is the canonical plan. If another document conflicts with this one, this document wins.

Supporting detail lives in:

- `docs/GUARDRAILS.md`
- `docs/AI_ASSISTED_RESEARCH_PLAN.md`
- `docs/QUERY_STRATEGY_PLAN.md`
- `docs/ADVERSARIAL_REVIEW_2026-06-22.md`
- `docs/superpowers/plans/2026-06-22-ai-research-layer.md`

## North Star

Dossier should answer one practical question:

Can we find, verify, and organize usable primary-source interrogation footage for serious research work?

Discovery is not enough. A good candidate is only a lead until a human verifies what the source actually contains.

The product must distinguish:

- Metadata says footage may exist.
- A court or public-records source references a recording.
- A human has confirmed playable primary footage.
- The footage is full, partial, courtroom playback, excerpted, unavailable, or not useful.
- The material is lawful and ethically appropriate to use.

## Correction

The earlier plan made discovery, provenance, and ranking explicit, but left footage verification implicit. That was the gap.

We built a real discovery and triage machine. We did not yet build the gate that decides whether a candidate is usable for the ultimate work.

Going forward, **verified usable footage** is the center of the roadmap.

`watch_now` means "worth checking." It does not mean "confirmed footage."

## Current Baseline

Dossier now has a real foundation:

- Seed, YouTube, CourtListener, and MuckRock sweeps run through connector interfaces.
- Sweeps, source hits, cases, candidates, reviews, records-request drafts, AI runs, and evidence claims persist in Postgres through Prisma.
- Candidate lists can be scoped to a single query run.
- Repeated live sweeps preserve duplicate external hits as separate run evidence instead of crashing.
- Sweeps build a deterministic source-aware query plan, run source-specific planned queries, and tag each live hit and candidate with query origin.
- Live connector candidates stay `provisional_metadata` until human review verifies the source packet.
- Live source hits can run source-packet extraction through an `AiResearchProvider` boundary.
- Missing `OPENAI_API_KEY` disables AI assistance without breaking sweeps.
- AI task inputs and outputs persist in `ai_runs`; extracted claims persist in `evidence_claims`.
- Dossiers show AI claims as inferred, needs review, or unsupported. AI cannot emit `directly_supported_by_source`.
- Records requests remain drafts.

Latest dry run for `jury views interrogation video`:

- `125` source hits stored.
- `5` seed hits.
- `30` YouTube hits.
- `60` CourtListener hits.
- `30` MuckRock hits.
- `12` scoped candidates after same-run candidate dedupe.
- `9` planned live queries.
- `0` missing candidate provenance.
- `0` live candidates missing planned-query origin.
- `0` live candidates incorrectly upgraded from `provisional_metadata`.
- `120` AI extraction runs.
- `169` AI evidence claims.
- `0` AI claims marked `directly_supported_by_source`.

What that dry run did not prove:

- It did not prove the live YouTube results are full interrogation footage.
- It did not prove the footage is usable for the ultimate work.
- It did not separate full footage, partial footage, courtroom playback, news package, or commentary.

## Product Gates

Every case should move through these gates.

### Gate 1: Discovery

Find candidate source hits from seed fixtures, YouTube, CourtListener, MuckRock, and future sources.

Output:

- Source hits with raw JSON.
- Query origin.
- Source provenance.

### Gate 2: Candidate Triage

Rank whether a hit is worth checking.

Output:

- Candidate score.
- Access path.
- Recommended next action.
- Claim status.
- Provisional metadata label for live hits.

### Gate 3: Footage Verification

Human review confirms what the candidate actually contains.

Output:

- Verification status.
- Full, partial, courtroom playback, records-only, commentary, unavailable, or rejected.
- Duration when available.
- Exact source URL.
- Verification notes.
- Reviewer and timestamp.
- Whether this is usable for the ultimate work.

This is the missing core layer and the next implementation priority.

### Gate 4: Dossier Integration

Group verified footage, court records, public-records leads, and AI claims into one case dossier.

Output:

- One coherent case page.
- No duplicate candidate spam.
- Claims grouped by support level.
- Related hits grouped by run and source.

### Gate 5: Research Leverage

Use verified footage and source-backed claims to decide what to watch, request, or research next.

Output:

- Watch queue for confirmed footage.
- Records request drafts for missing footage.
- Case resolution suggestions.
- Query strategy improvements.

## Active Plan

### Priority 1: Verified Footage Gate

Build this next.

Why:

This is the difference between a search product and a footage research workbench. Without it, the product can find leads but cannot confidently say what is usable.

What to build:

- Add a verification status model:
  - `unverified_metadata`
  - `watch_check_needed`
  - `confirmed_full_primary_footage`
  - `confirmed_partial_primary_footage`
  - `courtroom_playback_or_exhibit_reference`
  - `records_reference_only`
  - `unavailable_or_removed`
  - `reject_commentary_or_recap`
  - `reject_not_primary_footage`
  - `reject_ethics_or_restriction`
- Add a durable footage verification table linked to candidate, source hit, and case.
- Store:
  - reviewer
  - verified at
  - source URL
  - duration when visible from metadata or manual review
  - verification notes
  - usability flag
  - ethical restriction flag
- Add dossier controls for human verification.
- Add candidate-table filters for unverified, confirmed usable, rejected, and records-only.
- Rename or clarify UI copy so `watch_now` reads as "check source" until verification is complete.
- Keep verification manual. Do not download media. Do not analyze video content.

Done means:

- A live YouTube candidate cannot be treated as usable footage until it has a verification row.
- The dossier clearly says whether footage is full, partial, courtroom playback, records-only, or rejected.
- The confirmed watch queue only contains verified usable footage.
- Verification survives restart through Prisma.
- Tests prove metadata-only candidates do not enter the confirmed queue.

Acceptance demo:

- Run a sweep for `jury views interrogation video`.
- Open a live YouTube candidate.
- Mark it as one of:
  - confirmed full primary footage
  - confirmed partial primary footage
  - courtroom playback
  - reject commentary or recap
- Show the candidate moves from provisional triage into the correct verified bucket.
- Show no media was downloaded and no records request was submitted.

### Priority 2: YouTube Metadata Enrichment

Build this immediately after the verification gate.

Why:

Search metadata is too thin. Duration, channel ID, channel title, publish date, and official metadata help decide which candidates deserve human verification.

What to build:

- Use the official YouTube Data API to hydrate top search hits with `videos.list`.
- Store duration, channel ID, channel title, publish date, and available metadata.
- Preserve raw JSON.
- Do not download video or audio.
- Use duration only as a triage signal, not proof of full interrogation footage.
- Improve scoring so short news clips and obvious commentary rank below longer primary-source candidates.

Done means:

- A 2-minute news package does not rank like a 90-minute interrogation.
- The verification UI shows duration and channel metadata when available.
- Missing YouTube credentials still disables live enrichment without crashing the app.

### Priority 3: Dossier Deduplication and Run History

Build this after the verification gate starts producing real review data.

Why:

The browser dry run showed duplicate candidate evidence when repeated sweeps found the same external result. The data model preserves run evidence correctly, but the dossier should group duplicates for humans.

What to build:

- Group dossier candidate evidence by source hit identity or external URL.
- Show run history inside a grouped item.
- Preserve all source-hit provenance.
- Keep candidate queues run-scoped.

Done means:

- Repeated sweeps do not clutter a dossier with duplicate cards.
- The user can still see which runs found the same lead.

### Priority 4: Claim Model and Evidence Graph

Build this once the verification gate exists.

Why:

The current candidate object still mixes source facts, inferred classification, score explanation, and next action. Verified footage status and source claims should become the durable truth layer.

What to build:

- Define claim records for facts and inferences:
  - footage exists
  - footage is playable online
  - footage is full
  - footage is partial
  - court record references a recording
  - public-records path exists
  - source appears to be commentary or recap
  - ethical restriction may apply
- Store claim status:
  - `directly_supported_by_source`
  - `reasonable_inference`
  - `speculative`
  - `unsupported`
- Let deterministic parsing or human review create `directly_supported_by_source` claims.
- Keep AI claims limited to inference statuses.
- Link claims to source hit, source field, candidate, case, and verification row.

Done means:

- The dossier can answer "what do we know?" and "why do we believe it?" without treating title matches as fact.
- Candidate scoring can reference stored claims instead of reparsing titles.
- Source-supported and AI-inferred claims are visually distinct.

### Priority 5: AI-Assisted Case Resolution

Build this after verification and claim status are clean.

Why:

The product becomes integrated when one dossier combines YouTube footage, CourtListener records, and MuckRock request paths for the same case.

What to build:

- Suggest case merges from extracted identifiers and verified footage records.
- Use docket number and case caption as strongest signals.
- Use defendant plus jurisdiction as a medium-confidence signal.
- Use fuzzy title similarity only as weak support.
- Store suggested merges with confidence, evidence for merge, and evidence against merge.
- Keep ambiguous merges human-reviewable.

Done means:

- Related hits can land in one dossier.
- AI can suggest merges, but code or human review applies them.
- The UI shows why a merge is suggested.
- No ambiguous merge happens silently.

### Priority 6: Source-Specific Enrichment

Build this after verification and case resolution have clear data to target.

Why:

Enrichment is expensive and can sprawl. It should target promising leads, not every result.

What to build:

- YouTube:
  - Channel trust signals.
  - Official channel, Court TV, Law&Crime, local news, commentary, repost, and recap classification.
- CourtListener:
  - Enrich top leads with docket or opinion context when snippets mention suppression, Miranda, exhibits, recorded statements, or jury viewing.
  - Prefer RECAP before any paid-retrieval thinking.
- MuckRock:
  - Hydrate agency and request details only for promising records leads.
  - Preserve numeric agency and requester IDs when expanded data is not available.

Done means:

- Enrichment improves verification, ranking, or case resolution.
- It does not create broad scraping.
- It does not add PACER automation.

### Priority 7: AI Query Strategy Feedback Loop

Build this after enough verified and rejected footage data exists.

Why:

AI should help improve query language only after we have real verification outcomes. Otherwise it optimizes toward noisy metadata.

What to build:

- Analyze planned-query results against verification outcomes.
- Identify high-yield and noisy planned queries.
- Suggest source-specific additions, removals, and rewrites.
- Require human acceptance before planner behavior changes.

Done means:

- AI helps the search strategy evolve from actual review outcomes.
- Live sweeps remain explainable.
- No AI-generated query runs automatically in the MVP.

### Priority 8: Placeholder Surface Cleanup

Do this as a narrow reliability pass.

Why:

Guardrail-critical 501 routes are useful. Placeholder routes with no UI path, no tests, and no current value make the app look wider than it is.

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

- `packages/shared/src/types.ts`
- `packages/shared/src/ai-research.ts`
- `apps/web/lib/workbench-store.ts`
- `apps/web/lib/repository.ts`
- `apps/web/lib/candidate-normalization.ts`
- `apps/web/app/candidates/page.tsx`
- `apps/web/app/cases/[id]/page.tsx`
- `apps/web/components/candidate-table.tsx`
- `apps/web/components/review-actions.tsx`
- `prisma/schema.prisma`
- `prisma/migrations/20260622010000_init/migration.sql`
- focused tests under `packages/shared/src` and `apps/web/lib`

Avoid touching:

- Transcript pages and transcript API routes.
- Media storage routes.
- Records-request submission routes.
- PACER-related schema beyond existing inert enums.
- Video or transcript analysis.

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
- Missing API keys disable integrations, not the app.
- Live metadata remains provisional until human verification.
- No candidate enters the confirmed footage queue without a verification row.
- AI outputs are schema-validated before persistence.
- Every AI claim has provenance.
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
