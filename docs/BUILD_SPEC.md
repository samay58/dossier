# MVP Build Spec

The first build is a research triage machine, not a video-analysis machine.

It should help the user find rare cases where good footage probably exists, prove where that evidence came from, rank whether it is worth watching, and suggest the next lawful access path.

The acceptance demo starts from a sweep for `jury views interrogation video`, ranks seeded and live candidates, rejects obvious non-primary material, opens a case dossier, and drafts a public-records request without submitting it.

Phase 2 worker endpoints from the original plan are documented intent only. The MVP keeps sweep orchestration in the web app so there is no unused job layer duplicating classification and scoring logic.

AI should be a first-class research-assist layer, not a general autonomous agent. It should extract identifiers, claims, merge suggestions, query-plan suggestions, and dossier explanations from source packets with explicit provenance. Deterministic code owns guardrails, final scoring totals, persistence, and all irreversible actions.

The active roadmap lives in `docs/NEXT_STEPS.md`. The AI implementation detail lives in `docs/AI_ASSISTED_RESEARCH_PLAN.md`.
