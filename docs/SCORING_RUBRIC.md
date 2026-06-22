# Scoring Rubric

Candidate scoring combines deterministic category scores with transparent penalties. AI may explain or suggest scores, but code owns the final total.

Live API results are metadata-first. Scores from title and description matches are stored as `provisional_metadata`; seeded or human-reviewed source packets can be treated as `verified_source`.

## Categories

- Primary footage: 0 to 20
- Interrogation arc: 0 to 15
- Psychology and investigative richness: 0 to 15
- Sourcing and verification: 0 to 15
- Editorial fit: 0 to 10
- Audio/video quality: 0 to 10
- Ethical and legal safety: 0 to 10
- Uniqueness: 0 to 5
- Access feasibility: 0 to 10

## Hard penalties

- `reenactment_only`: -100
- `no_primary_footage`: -50
- `reaction_or_news_recap_only`: -40
- `minor_without_approval`: -30
- `active_case`: -25
- `graphic_private_victim_material`: -20
- `no_source_provenance`: -20
- `unclear_heavily_edited_repost`: -15
- `diagnosis_heavy_commentary`: -10
- `body_language_pseudoscience`: -10
