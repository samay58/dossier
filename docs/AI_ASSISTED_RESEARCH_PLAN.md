# AI-Assisted Research Plan

Last updated: 2026-06-22

This is the supporting AI design spec. The active priority order lives in `docs/NEXT_STEPS.md`, and the execution plan for the first AI pass lives in `docs/superpowers/plans/2026-06-22-ai-research-layer.md`.

## Position

Yes, the workbench should heavily use AI. The important distinction is where AI is allowed to be smart.

AI should accelerate research judgment by extracting entities, claims, identifiers, and follow-up paths from source metadata and documents. It should not become an opaque authority that says a suspect is deceptive, diagnoses anyone, publishes unsupported claims, downloads media, or submits records requests.

The right model is AI as a structured research analyst with citations. Deterministic code owns guardrails, persistence, final scoring totals, and irreversible actions.

## Current State

The MVP has:

- Deterministic query planning.
- Live connectors for YouTube, CourtListener, and MuckRock.
- Durable source hits, candidates, reviews, cases, and draft requests.
- Shared schemas for source-packet extraction.
- A deterministic mock AI provider for tests.
- An OpenAI structured-output provider behind `OPENAI_API_KEY`.
- Disabled AI mode when `OPENAI_API_KEY` is missing.
- Durable `ai_runs` records for task input, output, status, model, provider, and errors.
- Durable `evidence_claims` records linked to source hit, candidate, case, and source-field provenance.
- Provenance and `provisional_metadata` labels.

The AI layer extracts source-packet claims from live connector metadata only. It does not yet apply claims back into scoring, case merging, enrichment prioritization, or draft refinement.

## High-Value AI Jobs

### Source Packet Extraction

Input:

- Source title.
- Description or snippet.
- Author or agency.
- URL.
- Raw connector JSON.
- Planned query origin.

Output:

- People names.
- Case caption.
- Jurisdiction.
- Court or agency.
- Docket number or case number.
- Event date if directly stated.
- Whether the source appears to reference primary footage.
- Whether the source appears to be commentary, news recap, reenactment, or pseudoscience.
- Exact evidence fields used for each extracted claim.

Rules:

- Every output claim must include source field references.
- If the source only implies something, mark it as inference.
- If the model cannot identify a field, return null, not a guess.

### Case Resolution Assistance

Input:

- Candidate batch from one sweep.
- Extracted people, captions, jurisdictions, docket numbers, agencies, and aliases.

Output:

- Suggested case clusters.
- Suggested merge confidence.
- Evidence for merge.
- Reasons not to merge.

Rules:

- AI suggests merges only.
- Code or human review applies merges.
- Docket number and case caption outrank fuzzy title similarity.

### Query Strategy Suggestions

Input:

- Original user query.
- Planned-query results.
- Top rejects and weak hits.
- Successful planned queries.

Output:

- Suggested new source-specific queries.
- Suggested removed queries.
- Reason each query should exist.
- Expected evidence and reject hints.

Rules:

- Suggestions do not run automatically in MVP.
- Accepted suggestions become deterministic planner fixtures or settings.
- Query suggestions must be source-specific.

### Dossier Explanation

Input:

- Case cluster.
- Candidate evidence.
- Source hits.
- Records-request drafts.

Output:

- Short explanation of what is known.
- Short explanation of what is inferred.
- Missing identifiers.
- Next lawful access path.
- Questions for human review.

Rules:

- AI text cannot appear as fact unless backed by provenance.
- The dossier must visually distinguish source-supported claims from AI-inferred claims.

### Records Request Draft Refinement

Input:

- Existing deterministic draft.
- Known identifiers.
- Agency or court context.

Output:

- Cleaner draft wording.
- Narrower requested records list.
- Missing identifier checklist.

Rules:

- No submission.
- No claim that records exist unless a source supports it.
- Keep sealed, juvenile, restricted, and graphic private material exclusions.

## Provider Interface

Add a narrow provider boundary rather than sprinkling model calls through app code.

```ts
type AiResearchProvider = {
  extractSourcePacket(input): Promise<ExtractedSourcePacket>;
};
```

Current implementation:

- `createDisabledAiResearchProvider(reason)` returns skipped extraction with an empty packet.
- `createMockAiResearchProvider()` returns deterministic provenance-backed claims for tests.
- `createOpenAiResearchProvider()` calls the Responses API with a strict JSON schema and validates the result before persistence.
- `createAiResearchProvider({ env })` disables AI when `OPENAI_API_KEY` is missing.

## Data Model Additions

The current implementation keeps the data model narrow.

`ai_runs` stores:

- `id`
- `queryRunId`
- `sourceHitId`
- `taskType`
- `provider`
- `model`
- `status`
- `inputJson`
- `outputJson`
- `error`
- `createdAt`

`evidence_claims` stores:

- `id`
- `queryRunId`
- `sourceHitId`
- `candidateId`
- `caseId`
- `claimType`
- `text`
- `claimStatus`
- `provenanceJson`
- `createdByAiRunId`
- `createdAt`

Do not add vector memory or agent state until source-packet extraction and case-resolution suggestions prove useful.

## UI Shape

Keep AI visible but subordinate.

- Dossier: `Source supported`, `AI inferred`, and `Needs review` claim labels.
- Settings: show AI provider enabled or disabled.
- Future case merge view: show AI-suggested merges with evidence and "do not merge" reasons.

No chat interface in the MVP.

## Tests

- Structured output validation rejects missing provenance.
- AI-inferred claims never get `directly_supported_by_source`.
- Missing `OPENAI_API_KEY` disables AI tasks without breaking sweeps.
- Mock provider can extract case identifiers from representative YouTube, CourtListener, and MuckRock payloads.
- Prisma persistence keeps AI runs and evidence claims across store reconstruction.
- Case dossier shows claim status labels without making AI text look verified.
- Future case-cluster suggestions preserve source provenance.
- Query suggestions are not auto-executed.
- Records draft refinement never submits a request.

## Recommended Implementation Order

Completed:

1. Define schemas and provider interface.
2. Add disabled, mock, and OpenAI provider paths.
3. Run AI extraction on live source hits after sweep persistence.
4. Store extraction outputs without changing scoring.
5. Show extracted claim labels in dossiers.

Next:

1. Let deterministic source parsing create source-supported claims.
2. Use stored claims as the input to candidate scoring and routing.
3. Use extracted identifiers to suggest case resolution.
4. Add query-plan suggestion review, not automatic execution.
5. Add records-draft refinement only as a human-reviewed draft improvement.

## Non-Negotiables

- AI cannot download media.
- AI cannot submit records requests.
- AI cannot automate PACER.
- AI cannot diagnose people or score body language.
- AI cannot publish unsupported claims.
- AI cannot silently upgrade metadata-only evidence into verified fact.
