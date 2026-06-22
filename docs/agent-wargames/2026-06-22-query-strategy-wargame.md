# Query Strategy Wargame

**Question**: Should the next implementation pass add a small source-aware query planning layer before connector execution?
**Date**: 2026-06-22
**Scope**: Dossier MVP query quality. No downloading, request submission, PACER automation, transcript analysis, publishing, or multi-user collaboration.

## Source Packet

- `packages/shared/src/query-families.ts`: query families exist, but are static phrase lists.
- `apps/web/lib/repository.ts`: sweep orchestration sends the input query directly to selected connectors.
- `apps/web/lib/candidate-normalization.ts`: live candidates are classified from title and description terms.
- `packages/shared/src/connectors.ts`: YouTube, CourtListener, and MuckRock connectors accept a single query string and normalize metadata to `SourceHit`.
- `docs/SOURCE_CONNECTORS.md`: live title/description matches are provisional triage signals.
- `docs/SCORING_RUBRIC.md`: live scores are `provisional_metadata` until source packets are reviewed.

## Issue Ledger

1. Contract clarity
2. Result quality
3. Complexity creep
4. Operator experience
5. Testability
6. Rollback cost

## Round 1

### Builder

Claim: A query planner is the right next layer because the connector plumbing now works, and the bottleneck is search intent quality.

Evidence: The same broad query works well for YouTube but produces noisy MuckRock results and mixed CourtListener results. Court records and public-records requests use different language from media titles.

Counter to expected skepticism: This does not require an AI agent. It can be a pure deterministic function that emits source-specific queries.

Concession: The first version should not introduce a new database table or complicated UI.

Current state: Strong case for a small planner.

### Skeptic

Claim: Query planning could become a hidden complexity layer that makes it harder to understand why a candidate appeared.

Evidence: The app already has source hits, candidates, scores, claim status, and provenance. Adding query plans without visible origin labels would make ranking feel more mysterious.

Counter: If every `SourceHit` stores `plannedQueryId`, query text, and intent, the system becomes more explainable, not less.

Concession: The planner is acceptable if query origin is visible in the dossier and test output.

Current state: Complexity risk is real but containable.

### User Advocate

Claim: The operator needs sharper results, not more controls.

Evidence: The useful workflow is "run sweep, inspect best leads, route them." A query-builder UI would add effort before the system has earned it.

Counter: A hidden deterministic planner can improve results without adding operator friction.

Concession: Settings can expose defaults later, but first pass should use a fixed, documented plan.

Current state: Keep UI minimal.

## Round 2

### Builder

Claim: The first implementation should run a small number of planned queries per source and store the plan in `QueryRun.paramsJson`.

Evidence: The repository already persists source results in `paramsJson`, and source hits are run-scoped. Adding query metadata to source hits is enough for provenance.

Counter to new-table pressure: A `QueryPlan` table is premature until there is cross-run analytics or editing.

Concession: If planned queries multiply hit volume too much, cap per-source planned queries and dedupe within a run.

Current state: Store as JSON first.

### Skeptic

Claim: Query expansion can amplify false positives if the phrases are too broad.

Evidence: CourtListener returned generic cases from video-related terms. MuckRock returned unrelated administrative requests from broad media language.

Counter: That is exactly why source-specific phrase families matter. MuckRock should not receive `jury views interrogation video`; it should receive records-language queries.

Concession: Planned queries need baseline fixture tests and live smoke comparisons against the current broad-query baseline.

Current state: Proceed only with explicit acceptance checks.

### User Advocate

Claim: The best operator-facing addition is one label: "Found by: court exhibit query" or "Found by: YouTube primary-media query."

Evidence: The product's differentiator is provenance and truthfulness. Query origin helps explain why a hit is present without adding heavy copy.

Counter: The label should not crowd the table.

Concession: Put the compact label on the dossier and maybe a small table column later.

Current state: Dossier first.

## Concessions

- Do not build a query-builder UI in the first pass.
- Do not add a `QueryPlan` table yet.
- Do not use AI to generate arbitrary live queries.
- Do not hydrate every MuckRock or CourtListener hit before proving query quality improves.
- Store planned-query origin on source hits so the system remains explainable.

## Unresolved Questions

- How many planned queries per source should run by default? Initial answer: cap at three per live source.
- Should source-hit dedupe collapse duplicate external IDs within one run or preserve every planned-query path? Initial answer: preserve source-hit evidence but avoid duplicate candidate spam.
- Which YouTube channels should start as trusted? Initial answer: Court TV, Law&Crime, official agency or court channels, and local TV stations.

## Judge Summary

The planner should be built. The current MVP has enough ingestion and persistence. The next quality gap is not another connector or a bigger UI. It is making each source receive the language it actually understands.

The winning shape is deliberately small: deterministic query planning, source-hit query metadata, no new table, no query-builder UI, and tight tests.

## Best Current Call

Proceed with a small source-aware query planner as the next implementation pass.

## Fastest Uncertainty-Reducing Move

Implement `createQueryPlan`, run up to three planned queries per live source, tag each `SourceHit` with planned-query metadata, then compare one live sweep against the current `jury views interrogation video` baseline.
