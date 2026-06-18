# Nirman Darpan — निर्माण दर्पण

**An independent civic-transparency tracker for public works in Himachal Pradesh.**

Status, budgets, timelines, accountable leads, and citizen sentiment for active and completed projects — compiled from official tender & departmental portals, district press reporting, and verified social accounts.

> Not affiliated with the Government of Himachal Pradesh. Data reflects the latest available public record and may contain reporting lags or errors — verify against official sources before acting.

---

## What's in this repo

This is the **Phase-1 static prototype** of the product — a no-build vanilla HTML/CSS/JS site that recreates the intended look and behavior with 9 hand-authored sample projects. No server, no database, no build step.

```
.
├── index.html        — page shell, fonts, styles
├── app.js            — data (9 sample projects), state, render functions
├── docs/HANDOFF.md   — full product spec and roadmap (Phase 2 / Phase 3)
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
- **Featured hero** for a priority active project.
- **Active / Completed** tabs with counts.
- **Search** (name, contractor, district, category), **district** filter, **sort** (needs attention / progress / outlay / discussion).
- **Category chips** for one-click filtering.
- **Project cards** with status, progress, delay flag, outlay, contractor, and a stacked sentiment meter.
- **Detail panel (right-side modal)** with construction progress, key facts grid (awarded by, contractor, owner, outlay & spent, start / target), accountable leads, milestone timeline, public-perception score & breakdown, and a citizen-comment composer + thread.

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
