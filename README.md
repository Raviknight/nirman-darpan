# Nirman Darpan — निर्माण दर्पण

**An independent civic-transparency tracker for public works in Himachal Pradesh.**

Status, budgets, timelines, accountable leads, and citizen sentiment for active and completed projects — compiled from official tender & departmental portals, district press reporting, and verified social accounts.

> Not affiliated with the Government of Himachal Pradesh. Data reflects the latest available public record and may contain reporting lags or errors — verify against official sources before acting.

---

## What's in this repo

This is the **Phase-1 static prototype** of the product — a no-build vanilla HTML/CSS/JS site that recreates the intended look and behavior with **32 hand-authored projects** tagged by mandate level (Centre / State / District), covering every district in Himachal. No server, no database, no build step.

```
.
├── index.html                — page shell, fonts, styles, filter UI
├── app.js                    — state, render functions, event wiring
├── data/
│   ├── projects.js           — project dataset (loaded as a <script>)
│   ├── hp-districts.js       — HP district polygons (simplified from geohacker/india)
│   ├── meta.json             — rewritten by the auto-sync job
│   ├── sources.md            — catalogue of legit sources by authority level
│   └── config.js             — runtime config (paste Appwrite IDs here when ready)
├── scripts/
│   └── sync.mjs              — Node script the scheduled job runs
├── .github/workflows/
│   └── sync.yml              — Mon & Thu cron + manual dispatch
├── docs/HANDOFF.md           — full product spec and roadmap (Phase 2 / Phase 3)
└── README.md
```

## Run it locally

Just open `index.html` in any modern browser. There is **no install step**.

```
# Windows
start index.html
```

(If your browser blocks fonts loaded over `file://`, run a tiny local server instead — e.g. open the folder in VS Code and use the Live Server extension.)

## Deploy free on GitHub Pages

1. Push this repo to GitHub.
2. On the repo page → **Settings → Pages**.
3. Source: **Deploy from a branch**, branch: `main`, folder: `/ (root)`.
4. Save. After ~30 seconds, the site is live at `https://<your-username>.github.io/nirman-darpan/`.

## Features (this build)

- **Stats band:** active / completed / tracked outlay / avg sentiment / flagged.
- **Across Himachal map** — choropleth view shades each district by chosen metric (active projects, tracked outlay, flagged count, avg sentiment); click a district to filter. Toggle to a Leaflet pin view (OpenStreetMap tiles) showing each project's approximate site; click a pin to open the detail panel.
- **Featured hero** for a priority active project.
- **Active / Completed** tabs with counts.
- **Search** (name, contractor, district, category), **district** filter, **mandate** filter (Centre / State / District), **sort** (needs attention / progress / outlay / discussion).
- **Category chips** for one-click filtering.
- **Project cards** with status, progress, delay flag, outlay, contractor, a mandate badge, and a stacked sentiment meter.
- **Detail panel (right-side modal)** with construction progress, key facts grid (awarded by, contractor, owner, outlay & spent, start / target), accountable leads, milestone timeline, public-perception score & breakdown, and a citizen-comment composer + thread.

## Auto-sync

A GitHub Actions cron (`.github/workflows/sync.yml`) runs **Mondays and Thursdays at 19:00 UTC** (~00:30 IST next morning) and re-stamps `data/meta.json`. The site reads that file to render the "Auto-synced" header pill — so the timestamp visitors see reflects the last verified pass, not a hardcoded date. You can also kick the workflow off manually from the Actions tab → **Auto-sync → Run workflow**.

This is the heartbeat. Real source fetches (per `data/sources.md`) get plugged into `scripts/sync.mjs` as Phase 2 lands — they always land in a "pending review" queue that a human approves before going public (see `docs/HANDOFF.md`).

Comments posted in this build are stored only in the page's memory — they vanish on refresh. Persistence is part of Phase 2 (see roadmap).

## What's next — roadmap

Full Phase-1 / 2 / 3 plan is in [`docs/HANDOFF.md`](docs/HANDOFF.md). Short version:

- **Phase 2** — Replace the hardcoded data with a real database (your existing Supabase project), verified sign-in, persistent comments + ratings, and an admin/moderation page.
- **Phase 3** — Assisted ingestion: scrape a small set of official portals into a "pending review" queue, then add LLM sentiment scoring and broader source coverage.

## Design tokens

- **Fonts:** Source Serif 4 (headlines), Public Sans (UI), IBM Plex Mono (figures & dates), Noto Serif Devanagari (the निर्माण दर्पण wordmark).
- **Paper** `#f4f3ee` · **Pine** `#1b5640` · **Deep pine** `#123c2c` · **Gold** `#e8d9a8`.
- **Status:** in-progress pine `#1b5640` · completed teal `#3f6b6e` · delayed ochre `#b3721f`.
- **Sentiment:** positive `#3f9e6a` · neutral `#dcb24f` · concern `#c2664f`.

## License

MIT — see [LICENSE](LICENSE).
