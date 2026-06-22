# Adversarial Reliability Review

Date: 2026-06-22

Status: audit snapshot. The current roadmap lives in `docs/NEXT_STEPS.md`.

## Scope

Reviewed the current Dossier implementation after the MVP, Prisma persistence, live connector, MuckRock, and deterministic query-planning passes.

The intended product remains narrow: a private research triage workbench that discovers candidate primary-source interrogation footage, preserves provenance, scores research value, and routes cases to watch, research further, or draft records requests.

## What Was Tightened During Review

- Removed seed fixtures from the query-plan abstraction. Seed data is demo evidence, not live search strategy.
- Kept successful hits when only some planned queries fail, but now marks the source status as failed so partial live failures are visible.
- Added a regression test for partial planned-query failure handling.
- Added JSON error handling to `POST /api/sweeps`.
- Updated `docs/NEXT_STEPS.md` and `docs/QUERY_STRATEGY_PLAN.md` so they match the planner-era behavior.

## Findings

### Fixed: Seed Was Conceptually Overloaded

The query planner included `seed` as a planned-query source even though seed fixtures do not run external searches. This made the active plan look broader than the real live-search strategy and created a path for seed candidates to be mislabeled with live query intent.

Resolution: query planning now covers live searchable sources only: YouTube, CourtListener, and MuckRock. Seed candidates keep null planned-query fields.

### Fixed: Partial Planned-Query Failures Were Too Easy To Miss

When one planned query failed but another query from the same source returned hits, source status could read as succeeded while carrying an error field. That is a bad observability contract.

Resolution: any planned-query error marks that source result as failed, while preserving successful hits and candidates from other planned queries.

### Fixed: Sweep API Could Return Framework Error HTML

`POST /api/sweeps` did not wrap repository errors. If persistence or orchestration failed, smoke scripts and the UI could receive a framework error page instead of a JSON error.

Resolution: sweep failures now return `{ "error": "..." }` with status 500.

### Open: Candidate Normalization Is Becoming A Policy Junk Drawer

`apps/web/lib/candidate-normalization.ts` currently owns source trust, reject hints, case-title extraction, scoring inputs, access-path inputs, and next-action routing. It is still small enough to understand, but this is the next place complexity will accumulate.

Recommendation: extract source trust and candidate routing into shared pure functions with focused tests before adding more heuristics.

### Open: Placeholder Routes Still Need A Contract Pass

The guardrail-critical 501 routes are useful because they make forbidden workflows explicit. Some placeholder surfaces may still advertise Phase 2 routes before the MVP uses them.

Recommendation: keep 501s for no transcription, no interrogation analysis, no media storage, and no automatic submission. Remove or hide any placeholder API routes that are neither guardrails nor used by the UI.

### Open: Case Resolution Is Still Too Naive

Live hits still create cases mostly from title heuristics. This keeps the MVP simple, but it prevents the product from feeling genuinely integrated across YouTube, CourtListener, and MuckRock.

Recommendation: prioritize case-resolution rules using docket number, case caption, defendant, jurisdiction, source title aliases, and known media titles.

## Guardrail Check

- No video downloading was added.
- No records-request submission was added.
- No PACER automation was added.
- No transcript or interrogation analysis workflow was added.
- Live metadata remains provisional.
- Records requests remain drafts.
- Raw source JSON remains preserved in source hits.
- Local demo still works from seed data.

## Roadmap Update

This review was folded into the canonical roadmap. The highest-impact next pass is AI-assisted source-packet extraction, then claim modeling and case resolution:

- Extract source-packet identifiers and claims with provenance.
- Use extracted identifiers to merge related live hits into one dossier.
- Move source trust and routing rules out of candidate normalization before adding more heuristics.
