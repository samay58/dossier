# Guardrails

This project is a private research workbench. It must not become a downloader, publisher, or guilt-by-vibes analysis tool.

## Legal boundaries

- Store provenance for every source hit, document, media reference, verification decision, and AI claim.
- Do not download YouTube or third-party platform videos automatically.
- Do not bypass paywalls, CAPTCHAs, login controls, robots.txt, or platform terms.
- Do not automate PACER login in the MVP.
- Prefer RECAP before PACER.
- Require human approval before storing media files.
- Require human approval before filing public-records requests.
- Require human approval before exporting anything for publication.

## Ethical boundaries

- Flag minors, active investigations, graphic/private victim material, and restricted records.
- Do not infer guilt from demeanor.
- Do not diagnose people.
- Do not present body language as lie detection.
- Keep false-confession risk caveats tied to sourced facts.

## AI claim status

Every claim must be labeled as one of:

- `directly_supported_by_source`
- `reasonable_inference`
- `speculative`
- `unsupported`

AI-generated claims cannot use `directly_supported_by_source`; direct support belongs to deterministic source parsing or human review.

Only directly supported claims and carefully labeled reasonable inferences should appear in a main dossier.

## Footage verification

Metadata can route a candidate to human review, but it cannot make footage usable.

Human verification must distinguish:

- full primary footage
- partial primary footage
- courtroom playback or exhibit reference
- records-only reference
- unavailable or removed source
- commentary, recap, reenactment, or non-primary material
- ethical or legal restriction

Verification must not download media, bypass platform restrictions, or analyze interrogation behavior.
