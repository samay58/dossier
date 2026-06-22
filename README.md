# Dossier

Dossier is a private research tool for discovering, evaluating, and organizing primary-source criminal justice footage, including interrogation videos, suspect interviews, confession recordings, trial footage, bodycam, dashcam, 911 audio, and related court/public-records documents.

The tool is designed for serious research, not sensational true-crime content. It emphasizes provenance, lawful access, careful sourcing, interrogation-literacy, and human review.

The system rejects reenactments, reaction videos, unsupported claims, diagnosis-from-demeanor, and body-language pseudoscience.

## Local setup

```bash
npm install
npm run db:generate
npm run dev
```

The app serves at `http://localhost:3000`. The app ships with seeded fixtures, so the first demo works without external API keys. To use durable Postgres locally:

```bash
docker compose up -d
npm run db:push
npm run db:seed
```

Docker maps Postgres to `localhost:55433` because many local machines already have another Postgres on `5432`. `.env.example` uses that port:

```bash
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench"
```

Quick DB smoke:

```bash
npm run db:generate
DATABASE_URL="postgresql://workbench:workbench@localhost:55433/workbench" npm run db:seed
```

When `DATABASE_URL` is configured, sweeps, candidates, review decisions, and records-request drafts persist through Prisma. Without external API keys, the seed source remains available and live integrations show as disabled. If `npm run build` runs while a Next dev server is open, restart `npm run dev` before debugging local routes so the dev server reloads the current `.next` output cleanly.

## First demo

Open `http://localhost:3000/discover`, run the `jury views interrogation video` sweep, then inspect the ranked candidate queue and case dossier. The demo never downloads third-party platform videos and never submits public-records requests.

## Project docs

- `docs/NEXT_STEPS.md`: canonical living roadmap and current implementation priority.
- `docs/AI_ASSISTED_RESEARCH_PLAN.md`: AI research-assist design spec.
- `docs/superpowers/plans/2026-06-22-ai-research-layer.md`: execution plan for the first AI layer.
- `docs/QUERY_STRATEGY_PLAN.md`: implemented query-planning design record.
- `docs/GUARDRAILS.md`: legal, ethical, and AI claim-status boundaries.
