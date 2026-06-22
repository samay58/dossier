# Query Strategy Plan

Last updated: 2026-06-22

Status: implemented as the deterministic live-query planner. This document is the design record for query planning, not the active roadmap. The current roadmap lives in `docs/NEXT_STEPS.md`.

## Goal

Turn one broad research prompt into a small, source-aware query plan that reliably finds candidate primary-source interrogation footage, court-record references, and public-records paths without overclaiming what metadata proves.

This was the next highest-leverage improvement because the system could ingest and persist live results, but the broad query `jury views interrogation video` showed uneven source quality:

- YouTube finds strong watch candidates.
- CourtListener finds some useful legal leads but needs more targeted language.
- MuckRock is live but noisy when queried broadly.

## Non-Goals

- Do not download videos.
- Do not submit records requests.
- Do not automate PACER.
- Do not analyze transcripts or video content.
- Do not add a general AI research agent.
- Do not publish or export unsupported claims.

## Prior Behavior Replaced

Earlier sweeps sent the same user query directly into each enabled connector. Query-family constants existed, but they were not used as the main planning layer for sweeps.

Current result:

- Good YouTube hits for obvious phrases like `jury views interrogation video`.
- Weak CourtListener precision because docket/opinion language often differs from media language.
- Weak MuckRock precision because records requests use administrative phrasing, not court-media phrasing.

## Implemented Shape

Added a `QueryPlan` layer in the shared package. A plan expands one research intent into source-specific query variants with intent labels and guardrails.

```ts
type QueryIntent =
  | "online_primary_media"
  | "court_record_reference"
  | "suppression_or_miranda"
  | "trial_exhibit"
  | "public_records_request"
  | "negative_filter_probe";

type PlannedQuery = {
  id: string;
  source: "youtube" | "courtlistener" | "muckrock";
  query: string;
  intent: QueryIntent;
  priority: number;
  expectedEvidence: Array<"video_metadata" | "docket_reference" | "request_record" | "agency_identifier">;
  rejectHints: string[];
};

type QueryPlan = {
  id: string;
  originalQuery: string;
  family: string;
  plannedQueries: PlannedQuery[];
};
```

The sweep orchestrator runs the planned queries per live connector, stores query-plan metadata on the `QueryRun`, and tags each live `SourceHit` with the planned query that produced it. Candidate records also carry the planned-query origin so the UI can show why the hit appeared without extra source-hit lookups.

Seed fixtures are not planned queries. They remain source-supported demo evidence with null planned-query fields.

Duplicate external results within one run are handled deliberately:

- Source hits preserve each planned-query evidence path.
- Candidates are deduplicated by source and external ID or URL so the triage queue does not flood with repeated rows.

## Query Families

### YouTube Primary Media

Purpose: find playable or inspectable primary-source footage and trial clips.

Strong phrases:

- `jury views interrogation video`
- `jury views police interview`
- `full police interrogation`
- `full suspect interview`
- `recorded police interview trial`
- `defendant police interview played in court`
- `interrogation video court tv`
- `law crime police interrogation trial`

Negative hints:

- reaction
- body language
- behavior analyst
- recap
- reenactment
- documentary
- podcast

Ranking implications:

- Court TV, Law&Crime, local news, official agency, and court channels should score differently.
- A title match alone stays `provisional_metadata`.
- A source from commentary channels should get a penalty until reviewed.

### CourtListener Court Records

Purpose: find legal records that prove a recording exists or was litigated.

Strong phrases:

- `"motion to suppress" "recorded interview"`
- `"motion to suppress" Miranda video`
- `"custodial interrogation" recording`
- `"defendant's statement" "video recording"`
- `"law enforcement interview" recording`
- `"recorded statement" Miranda`
- `"trial exhibit" "recorded interview"`
- `"jury viewed" "interview"`

Ranking implications:

- CourtListener hits should rarely be `watch_now`.
- They should route to `draft_records_request`, `find_docket`, or `research_case`.
- The claim should be `court record may reference recording`, not `footage is available`.

### MuckRock Public Records

Purpose: find existing public-records requests or request templates that suggest an access path.

Strong phrases:

- `"recorded interview" "police department"`
- `"interrogation video" "public records"`
- `"interview room video" "public records"`
- `"Miranda" "recorded interview" "public records"`
- `"custodial interview" "body camera"`
- `"case number" "recorded interview"`

Avoid broad media phrases:

- `jury views interrogation video`
- `Court TV`
- `full interrogation`

Ranking implications:

- MuckRock search hits are access-path leads, not watch candidates.
- `done` requests may indicate existing records path, but not necessarily useful footage.
- Non-expanded agency/user IDs should be preserved, then hydrated only for promising hits.

## Data Model Changes

Kept this small.

Add fields to `SourceHit`:

- `plannedQueryId: string | null`
- `plannedQuery: string | null`
- `queryIntent: QueryIntent | null`

The same fields are stored on `Candidate` for UI and API ergonomics. The full query plan is stored in `QueryRun.paramsJson` through `queryRun.queryPlan`.

Do not add a separate `QueryPlan` table until we need cross-run analytics.

## Implementation Notes

- Shared query-planning types and `createQueryPlan(input)` live in `packages/shared/src/query-planning.ts`.
- Connectors receive a `PlannedQuery` from orchestration and only tag results. Connectors do not create strategy.
- The sweep orchestrator builds one plan per sweep, runs up to three planned queries per live source, stores the plan on the run, and deduplicates candidate rows within the run.
- Partial planned-query failures are surfaced in source status while successful hits are still preserved.
- Candidate normalization uses source and query intent when routing next actions. CourtListener and MuckRock planned hits do not route to `watch_now`.
- The UI shows a compact active-plan summary on discovery and a found-by label in dossier evidence.

No query-builder UI, AI-generated query strategy, or query-plan table was added.

## Tests

Unit tests:

- Query plan expands a broad research intent into source-specific planned queries.
- YouTube plans include primary-media phrases and reject hints.
- CourtListener plans include suppression, Miranda, recorded statement, and exhibit language.
- MuckRock plans avoid broad media phrases and include public-records language.
- Planned-query metadata survives normalization into `SourceHit`.
- Candidate routing changes by query intent.
- Metadata-only live hits remain `provisional_metadata`.

Integration tests:

- Seed plus live-shaped fake connectors run multiple planned queries and store planned-query metadata.
- Two planned queries returning the same YouTube external ID preserve provenance without duplicating candidates unnecessarily.
- CourtListener planned queries route to research/request actions, not watch actions.
- MuckRock planned queries preserve status, agency ID, requester ID, raw JSON, and access-path classification.

Live smoke:

- Run `jury views interrogation video`.
- Confirm YouTube top hits remain strong.
- Confirm CourtListener top hits are more legally relevant than generic `video` cases.
- Confirm MuckRock results improve over the current broad-query baseline.

## Acceptance Criteria

- A sweep still works with no external API keys using seed fixtures.
- A live sweep runs without duplicate-hit crashes.
- Every candidate keeps provenance and score status.
- The UI makes planned-query origin visible without clutter.
- YouTube watch candidates rank above commentary, reaction, and generic news recaps.
- CourtListener leads route to research or records-request actions.
- MuckRock does not flood the top queue with unrelated administrative requests.
- No new forbidden workflow is introduced.

## Fastest Useful First Cut

Implement query planning with no new tables:

- Add `createQueryPlan`.
- Store the plan in `QueryRun.paramsJson`.
- Add planned-query fields to `SourceHit`.
- Run up to three planned queries per live source.
- Keep the UI change to one small label per candidate.

This is enough to prove whether better query strategy improves result quality before adding deeper enrichment or a query-plan data model.
