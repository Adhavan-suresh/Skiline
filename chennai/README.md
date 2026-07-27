# Chennai — Housewives & Retirees

Meta lead-gen campaigns recruiting insurance advisors in Chennai, split across two personas (Housewives, Retirees).

## Setup

```
npm install
```

Requires `.env` (Meta token, ad account ID, page ID — see `config/` for the service-account key used for Google Sheets access) and `config/service-account.json` (Google service account with Editor access to the leads spreadsheet). Neither is committed — get them from whoever hands off this project.

## Structure

- `api/webhook.js` — Vercel serverless function, real-time lead capture (deployed separately, not run locally).
- `server.js` — legacy Railway webhook, decommissioned 2026-07-23. Kept for reference only, not deployed.
- `scripts/reporting/` — read-only analysis and dashboards (CPL, quality, conversions).
- `scripts/campaign-ops/` — launch, pause, toggle, budget changes. These mutate live ads — read before running.
- `scripts/audience/` — targeting, lookalikes, exclusions.
- `scripts/lead-sync/` — sheet sync, dedup, attribution backfill.
- `scripts/archive/` — one-off fix scripts that already served their purpose, kept for audit history only.
- `assets/` — creative images and reference spreadsheets, gitignored (binary/large).
- `backups/`, `logs/`, `output/` — all gitignored, generated at runtime.
- `reports/` — client-facing PDF/HTML reports.
- `ops/` — Task Scheduler admin helpers (`fix-tasks-admin.ps1`).

## Automation

Two Windows Scheduled Tasks point at this folder: `SkiLine-Sync-Leads-Daily` (`run-sync.bat`) and `SkiLine-Toggle-Ads-Weekly` (`run-toggle.bat`). If either folder path ever changes again, run `ops/fix-tasks-admin.ps1` as Administrator to repoint them.

Real-time lead capture goes through the Vercel webhook, not these local jobs — the daily sync is a reconciliation safety net.

See `../CAMPAIGN-SKELETON.md` for the full campaign pipeline this follows.
