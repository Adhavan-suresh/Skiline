# Campaign Workflow Skeleton
### Reusable template for Meta Ads recruitment/acquisition campaigns

---

## End-to-End Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [OFFLINE CONVERTERS]                                               │
│       │                                                             │
│       ▼                                                             │
│  STAGE 4: AUDIENCE BUILDING ◄──────────────────────┐               │
│       │ (lookalike from offline list)               │               │
│       ▼                                             │               │
│  STAGE 1: CAMPAIGN SETUP                           │               │
│       │ (one-time: campaign + ad sets + ads)        │               │
│       ▼                                             │               │
│  STAGE 5: WEEKLY TOGGLE (every Monday)             │               │
│       │ (activate/pause segments on schedule)       │               │
│       ▼                                             │               │
│  STAGE 2: AD DELIVERY + LEAD CAPTURE (daily)       │               │
│       │ (Meta serves ads → users fill lead form)    │               │
│       ▼                                             │               │
│  STAGE 3: LEAD EXPORT (daily, 8:00 AM)             │               │
│       │ (Meta API → deduplicate → Google Sheet)     │               │
│       ▼                                             │               │
│  [ADVISOR FOLLOW-UP + CONVERSION]                  │               │
│       │                                             │               │
│       └─────── converted advisors feed back ───────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1 — Campaign Setup (One-time)

**Purpose:** Create campaign hierarchy in Meta Ads Manager.

**Inputs required:**
- Ad account ID
- Page ID
- Segment definitions (name, age range, gender, targeting)
- Ad creative IDs (images/videos — uploaded separately in Ads Manager)
- Lead form IDs (created separately in Ads Manager)
- Daily budget per segment
- Campaign schedule (start date, number of weeks, segment rotation)

**Actions:**
1. Create or reuse campaign (traffic/lead gen objective)
2. For each segment: create ad set with targeting + budget (status: PAUSED)
3. For each ad set: create ad linked to creative + lead form
4. Write all generated IDs to `config/weekly-schedule.json`

**Script:** `scripts/setup.js`

**Outputs:**
- `config/weekly-schedule.json` — master config with campaign ID, ad set IDs, ad IDs, form IDs
- All entities created in PAUSED state (toggle activates them)

**Run once. Re-run only if starting a new phase.**

---

## Stage 2 — Ad Delivery + Lead Capture (Ongoing, automated by Meta)

**Purpose:** Meta serves ads to targeted audiences; prospects fill on-ad lead form.

**No script needed.** Meta handles delivery automatically once ad sets are active.

**Lead form fields to collect:**
- Full name
- Phone number (10-digit)
- Email address
- [Any segment-specific qualifier questions]

**Lead form IDs stored in:** `config/weekly-schedule.json`

**Active segment budget:** ₹[X]/day (set during toggle)
**Inactive segment:** PAUSED (₹0 spend)

---

## Stage 3 — Lead Export to Google Sheets (Daily)

**Purpose:** Pull new leads from Meta API, deduplicate, append to Google Sheet.

**Trigger:** Daily at 8:00 AM via Windows Task Scheduler (`run-sync.bat`)

**Script:** `scripts/sync-leads.js`

**Logic:**
1. Read `config/weekly-schedule.json` → determine active segment
2. Pull all leads from Meta API for active form ID
3. Deduplicate by email vs existing rows in sheet
4. Normalize phone: strip +91, convert to 10-digit
5. Append new rows to correct sheet tab

**Google Sheet structure:**
- One tab per segment (e.g., "Segment A", "Segment B")
- Columns: Index | Date (IST) | Name | Phone | Email

**Auth:** Google Service Account key at `config/service-account.json`

**Logs:** `logs/sync.log`

**Batch file:** `run-sync.bat`

---

## Stage 4 — Offline Audience Building (As-needed, ~monthly)

**Purpose:** Upload converted advisors as seed → build Meta lookalike → apply to ad sets.

**Input:** Excel file with offline converters (Name + Phone columns)

**Sub-stages:**

### 4a. Local Analysis
**Script:** `scripts/analyze-local.js`
- Reads Excel, classifies demographics (gender, community, phone series)
- Outputs HTML dashboard: `output/audience-demographics.html`
- Purpose: understand converter profile before uploading

### 4b. Upload to Custom Audience
**Script:** `scripts/upload-audience.js`
- Normalize + SHA256-hash phone numbers (privacy)
- Create or update Custom Audience in Meta
- Upload hashed phones in batches
- **Wait 24–72 hours for Meta to process**

### 4c. Create Lookalike
**Script:** `scripts/create-lookalike.js`
- Run after processing window
- Creates 1% Lookalike Audience from custom audience
- Stores Lookalike ID in config

### 4d. Analyze Lookalike
**Script:** `scripts/analyze-audience.js`
- Fetches reach estimates + match stats from Meta
- Outputs: `output/audience-meta-analysis-YYYY-MM-DD.json`

### 4e. Apply Lookalike to Ad Sets
**Script:** `scripts/apply-lookalike.js`
- Dry-run mode: `npm run audience:apply:dry`
- Live mode: `npm run audience:apply`
- Layers lookalike onto existing ad set targeting

**Full timeline:**
```
Day 1:  upload-audience.js    → hashed phones → Meta
Day 2–3: [Meta processes]
Day 4:  create-lookalike.js   → 1% lookalike created
Day 5–6: [Meta populates]
Day 7:  analyze-audience.js   → verify reach
Day 8:  apply-lookalike.js    → applied to ad sets
```

---

## Stage 5 — Weekly Segment Toggle (Every Monday)

**Purpose:** Rotate active segment on schedule, set budget, pause inactive segment.

**Trigger:** Every Monday at 8:00 AM via Windows Task Scheduler (`run-toggle.bat`)

**Script:** `scripts/weekly-toggle.js`

**Logic:**
1. Calculate current week number from campaign start date
2. Read config → get active segment for this week
3. PAUSE all ad sets + ads for inactive segment
4. ACTIVATE ad sets + ads for active segment → set daily budget
5. Log all actions
6. Update `config/weekly-schedule.json` with current week timestamp

**Modes:**
- `npm run toggle:dry` — preview only
- `npm run toggle` — live

**Logs:** `logs/toggle-YYYY-MM-DD.log`

**Batch file:** `run-toggle.bat`

---

## Config Files

| File | Purpose |
|------|---------|
| `.env` | Meta Access Token, Ad Account ID, Page ID |
| `config/weekly-schedule.json` | Master schedule + all Meta entity IDs |
| `config/service-account.json` | Google Sheets auth (Service Account key) |
| `config/scheduler-config.json` | Cron timing for daily sync + weekly toggle |

### `weekly-schedule.json` structure
```json
{
  "campaign_id": "...",
  "start_date": "YYYY-MM-DD",
  "current_week": 1,
  "google_sheet_id": "...",
  "weeks": [
    {
      "week": 1,
      "dates": "MMM DD - MMM DD, YYYY",
      "active_segment": "segment_a",
      "ad_group_ids": {
        "segment_a": {
          "adset_id": "...",
          "ad_id": "...",
          "form_id": "..."
        },
        "segment_b": {
          "adset_id": "...",
          "ad_id": "...",
          "form_id": "..."
        }
      }
    }
  ]
}
```

---

## npm Scripts Reference

```json
{
  "toggle":              "node scripts/weekly-toggle.js",
  "toggle:dry":          "node scripts/weekly-toggle.js --dry-run",
  "sync":                "node scripts/sync-leads.js",
  "leads":               "node scripts/pull-leads.js",
  "setup":               "node scripts/setup.js",
  "audience:analyze-local": "node scripts/analyze-local.js",
  "audience:upload":     "node scripts/upload-audience.js",
  "audience:lookalike":  "node scripts/create-lookalike.js",
  "audience:analyze":    "node scripts/analyze-audience.js",
  "audience:apply:dry":  "node scripts/apply-lookalike.js --dry-run",
  "audience:apply":      "node scripts/apply-lookalike.js"
}
```

---

## File Structure

```
[campaign-folder]/
├── .env                              # Secrets (never commit)
├── package.json
├── run-sync.bat                      # Daily lead sync trigger
├── run-toggle.bat                    # Weekly toggle trigger
│
├── config/
│   ├── weekly-schedule.json          # Master config + IDs
│   ├── scheduler-config.json         # Cron timings
│   └── service-account.json          # Google auth (never commit)
│
├── scripts/
│   ├── setup.js                      # One-time campaign setup
│   ├── sync-leads.js                 # Daily: Meta → Google Sheets
│   ├── pull-leads.js                 # Manual: CLI lead viewer
│   ├── weekly-toggle.js              # Weekly: segment rotation
│   ├── analyze-local.js              # Offline list demographics
│   ├── upload-audience.js            # Hash + upload to Meta
│   ├── create-lookalike.js           # Build 1% lookalike
│   ├── analyze-audience.js           # Meta reach/match stats
│   └── apply-lookalike.js            # Apply lookalike to ad sets
│
├── assets/
│   ├── [Converters List].xlsx        # Offline advisors for lookalike
│   └── [Phase X]/                    # Ad creative images
│
├── output/
│   ├── audience-demographics.html    # Local analysis report
│   └── audience-meta-analysis-*.json
│
└── logs/
    ├── sync.log
    └── toggle-YYYY-MM-DD.log
```

---

## Automation Schedule

| Frequency | Day/Time | Script | Trigger |
|-----------|----------|--------|---------|
| Daily | 8:00 AM IST | `sync-leads.js` | `run-sync.bat` via Task Scheduler |
| Weekly | Monday 8:00 AM | `weekly-toggle.js` | `run-toggle.bat` via Task Scheduler |
| One-time | As needed | `setup.js` | Manual |
| As-needed | After converter list update | Audience pipeline | Manual (4-step) |

---

## New Campaign Checklist

### Before running setup:
- [ ] Create campaign folder, copy scripts
- [ ] Define segments (name, age, gender, targeting spec)
- [ ] Upload ad creatives → note Creative IDs
- [ ] Create Meta lead forms for each segment → note Form IDs
- [ ] Create Google Sheet with one tab per segment
- [ ] Create Google Service Account → share sheet with it
- [ ] Fill `.env` with Meta token, Ad Account ID, Page ID
- [ ] Build `config/weekly-schedule.json` with segment rotation plan

### After setup:
- [ ] Run `npm run toggle:dry` → verify correct segment activates
- [ ] Run `npm run sync` → verify Google Sheet appends
- [ ] Set up Windows Task Scheduler for daily sync + weekly toggle
- [ ] Run `npm run toggle` → go live

### First audience cycle (after first converters exist):
- [ ] Export converted advisors to Excel (Name + Phone)
- [ ] Run audience pipeline steps 4a → 4e
- [ ] Verify lookalike applied: `npm run audience:apply:dry`
- [ ] Go live: `npm run audience:apply`

---

## Key Concepts for Reuse

**Segments** = any two audience groups you want to alternate between weekly.
Could be demographics, geographies, job types, income brackets — anything.

**Segment rotation** = week 1 runs Segment A, week 2 runs Segment B, repeating.
Concentration effect: full daily budget on one segment at a time.

**Lookalike feedback loop** = converters from this campaign become the seed
for the next audience cycle. Better data → better lookalike → lower CPL.

**Google Sheet as lightweight CRM** = leads append daily, tabs per segment,
manual export to Excel for follow-up team. No CRM software required.
