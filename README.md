# Skiline Ad Ops

Meta (Facebook/Instagram) lead-generation ad automation for Skiline Recruitment. Two client campaigns, one workspace:

- **[chennai/](chennai/README.md)** — Housewives + Retirees persona campaigns (Chennai)
- **[surat/](surat/README.md)** — Leaders/agent recruitment campaign (Surat)

Each is a self-contained Node.js project (own `package.json`, `.env`, `config/`). See each subfolder's README for setup and how to run it.

## Shared

- `CAMPAIGN-SKELETON.md` — the reusable 5-stage campaign pipeline both projects follow (setup → delivery → lead export → lookalike audiences → weekly toggle).
- `research/competitor-ads/` — competitor creative reference screenshots, not tied to either client specifically.

## Secrets

Never committed. Each project's `.env` and `config/service-account.json` are gitignored. If you find a credential file sitting loose anywhere in this workspace outside a `config/` folder, that's a bug — move it and flag it.

## Automation

Both projects run scheduled local jobs via Windows Task Scheduler (`run-sync.bat` / `run-toggle.bat` in each folder) in addition to a live Vercel webhook (`chennai/api/webhook.js`, deployed at `skiline-zeta.vercel.app/api/webhook`) that captures leads in real time. The local scheduled jobs are a reconciliation safety net, not the primary path.
