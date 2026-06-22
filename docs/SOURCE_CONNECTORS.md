# Source Connectors

Connectors return normalized `SourceHit` objects. The MVP includes seed fixtures for local demos, live metadata connectors for YouTube, CourtListener, and MuckRock when credentials are configured, and an interface-ready placeholder for DocumentCloud.

## Connector rules

- Use official APIs or configured compliant search providers.
- Store metadata and links by default, not copyrighted media files.
- Treat missing credentials as a disabled source, not a fatal app error.
- Preserve raw source JSON for provenance.
- Preserve each sweep's source-hit record even when the same external result appears in more than one query run.
- Treat title and description matches from live APIs as provisional triage signals until a human reviews the source packet.
