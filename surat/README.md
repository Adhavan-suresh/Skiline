# Surat — Leaders / Agent Recruitment

Meta lead-gen campaign recruiting insurance leaders/agents in Surat.

## Setup

```
npm install
```

Requires `.env` and `config/service-account.json` (same Google Sheets service account as Chennai, Editor access to the shared leads spreadsheet, "Surat" tab). Neither is committed.

## Structure

- `scripts/campaign-ops/` — launch/setup scripts for Surat ad phases. Mutate live ads — read before running.
- `scripts/lead-sync/` — `pull-leads.js`, read-only lead pull for spot-checks.
- `scripts/archive/` — `sync-leads.js`, deprecated 2026-07-23 (lacked source-ad attribution, caused Google Sheets API write-quota errors from per-row updates). Kept for reference only — do not re-enable its scheduled task.
- `assets/`, `logs/` — gitignored, generated/binary content.
- `reports/` — client-facing PDF/HTML reports.

## Automation

Real-time lead capture goes through the same Vercel webhook as Chennai (`../chennai/api/webhook.js`, deployed at `skiline-zeta.vercel.app/api/webhook`) — routes by form name. The `Skiline Surat Leads Sync` scheduled task is currently disabled; its `run-sync.bat` is kept for manual reference only.

This project was brought under version control for the first time on 2026-07-27 — previously it had zero git history or backup. See the root `README.md` for the shared campaign pipeline.
