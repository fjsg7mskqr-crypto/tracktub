# Incidents

Postmortems for production incidents — what broke, why, and what changed so it
can't recur. One file per incident, named `YYYY-MM-DD-<slug>.md`.

| Date | Incident | Severity | Status |
|------|----------|----------|--------|
| 2026-06-08 | [Production outage — site-wide 500](2026-06-08-production-outage.md) | High | Resolved |
| 2026-06-14 | [Prod schema changed ahead of reviewed UI (shared DB, via MCP)](2026-06-14-prod-schema-via-mcp.md) | Low | Mitigated (cure: #45) |

## Writing a new entry
Copy the structure of an existing postmortem: summary, root cause, impact,
timeline, resolution, prevention, follow-ups. Keep it blameless — focus on the
system and process gaps, not who merged what.
