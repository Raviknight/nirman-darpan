# Handoff: Nirman Darpan — Himachal Pradesh Public Works Tracker

## Read this first (for the project owner)
This bundle contains a **finished visual design** (an HTML prototype) plus a **full specification** of the product to build around it. The design is real and accurate; the "automatic data collection" is a backend system that does **not** exist yet and is the bulk of the engineering work. This README tells a developer (or Claude Code) exactly what to build.

The owner is non-technical. Prefer **managed/hosted services** over self-managed infrastructure, and **build in phases** (see "Build Phases"). Do not attempt full automation in week one.

---

## Overview
A public, civic-transparency website that tracks public-works activities in Himachal Pradesh: when each started, current status, ETA, who was awarded the work, the executing company, accountable engineers/leaders, budget, public sentiment, ratings, and a comment section. Completed activities move to a "Completed" archive. Data is aggregated from public sources (government portals, press, verified social) — automatically where possible, with human review for trust.

## About the design files
`Nirman Darpan.dc.html` is a **design reference** — a working HTML/JS prototype showing the intended look and behavior. It is **not production code to ship directly**. Recreate it in a real stack (recommended below) using that stack's patterns. The prototype currently holds **9 hand-written sample projects**; production will hold hundreds, served from a database.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and layout are final. Recreate the UI faithfully. Exact tokens are in "Design Tokens" below.

---

## Recommended tech stack (optimized for a non-technical owner)
- **Framework:** Next.js (React) — one codebase for the site + admin + API.
- **Hosting:** Vercel (push to deploy, free tier to start).
- **Database:** Supabase (hosted PostgreSQL) — also gives you auth, a table editor UI, and a REST/realtime API out of the box. This is where projects, comments, ratings, and sources live.
- **Comment/rating storage & auth:** Supabase Auth (email or phone OTP) so "verified residents" is real, not decorative.
- **Background jobs (ingestion):** Supabase scheduled Edge Functions or a simple cron on Vercel; or a separate small worker (e.g. a Python service on Railway/Render) for scraping.
- **Sentiment analysis:** an LLM API (e.g. Claude) or a hosted NLP service to score scraped text and comments into positive/neutral/concern.

A non-technical owner can run the whole thing from Vercel + Supabase dashboards without managing servers.

---

## Data model (use this as your database schema)
Each **project** record (from the prototype's data objects):

| Field | Type | Notes |
|---|---|---|
| `id` | string (slug) | e.g. `NH5-PWN-SHL` |
| `name` | string | Project title |
| `category` | enum | Roads & highways · Bridges & tunnels · Hospitals & health · Power & hydro · Water & sanitation · Disaster recovery · Tourism infrastructure · Schools & education |
| `districts` | string[] | e.g. ["Solan","Shimla"] (for filtering) |
| `district_label` | string | Display string e.g. "Solan · Shimla" |
| `status` | enum | `active` \| `completed` |
| `progress` | int 0–100 | % complete |
| `delayed` | boolean | Behind-schedule flag |
| `start` | string/date | Start date |
| `eta` | string/date | Target completion (revised) |
| `completed` | string/date | Completion date (if completed) |
| `budget` | number | Sanctioned outlay, in ₹ crore |
| `spent` | number | Spent to date, in ₹ crore |
| `awarded_by` | string | Awarding authority |
| `contractor` | string | Executing company |
| `owner` | string | Owning department |
| `leads` | json[] | `{ name, role }` — accountable engineers/leaders |
| `description` | text | Short summary |
| `sentiment` | json | `{ positive, neutral, concern }` percentages |
| `score` | float 0–5 | Aggregate public rating |
| `ratings` | int | Number of voices/votes |
| `milestones` | json[] | `{ label, date, done }` timeline |
| `sources` | json[] | `{ type: gov\|press\|social, name }` provenance |
| `image_url` | string | Project photo (prototype uses a placeholder) |

**comments** table (one row per comment): `id`, `project_id` (FK), `author_name`, `location`, `sentiment` (positive/neutral/concern), `text`, `created_at`, `user_id` (FK to verified user), `status` (pending/approved/removed for moderation).

**ratings** table (optional, if you want recomputed scores): `id`, `project_id`, `user_id`, `value`, `created_at`.

> The aggregate `sentiment`, `score`, and `ratings` on a project should be **computed** from the comments/ratings tables (and from scraped sentiment), not hand-set.

---

## Screens / Views
### 1. Homepage / Tracker (`/`)
- **Header (sticky):** wordmark "निर्माण दर्पण / Nirman Darpan", tagline "Himachal Pradesh · Public works, in public view", an "Auto-synced <timestamp>" pill showing last ingestion run, and source badges (Govt portals · Press · Verified social). Dark pine background with a faint topographic ring motif.
- **Stats band:** 5 tiles — Active count, Completed count, Tracked outlay (sum of budgets), Avg positive sentiment (avg over active), Flagged (count of delayed active). Computed from the DB.
- **Disclaimer line:** states data is aggregated from public records, independently sourced, not government-endorsed.
- **Featured hero:** one highlighted active project (currently the Chandigarh–Shimla 4-lane highway) — large card with photo, description, status + delay pills, progress bar, started/ETA/outlay. Clicking opens the detail modal.
- **Tabs:** Active / Completed (with counts).
- **Filters:** text search (name/contractor/district/category), district dropdown, sort (Needs attention / Most progress / Largest outlay / Most discussed), and category chips.
- **Project grid:** 3-column cards. Each card: category tag + status pill over a photo; district + id; title; progress bar with % and ETA; delay warning if applicable; outlay + contractor; a stacked positive/neutral/concern sentiment meter with "% positive · N voices". Clicking opens the detail modal.
- **Footer:** brand + independent-project disclaimer.

### 2. Project Detail (modal / could be its own route `/project/[id]`)
Slides in from the right. Contains: photo hero with status pill; category · district · id; title; description; delay flag; **construction progress** bar; **key facts grid** (Awarded by, Contractor, Owning department, Sanctioned outlay + spent, Started, Target/Completed date); **"Who's accountable"** list of leads with initials avatars; **Timeline** of milestones (done = filled pine dot with check, pending = hollow); **Public perception** panel (0–5 score + stacked sentiment meter + positive/neutral/concern %); **Citizen comments** (count, a composer to pick sentiment + write + post, then the list of comments with avatar, name, location, date, sentiment tag); **Sourced from** chips.

### 3. Admin / Moderation (NEW — not in prototype, but required)
A protected area (Supabase Auth, admin role) to: add/edit projects, review and approve/reject scraped data before it goes public, moderate comments, and manually correct fields. **This is essential** — fully automated publishing without review will publish errors and spam.

---

## Interactions & Behavior
- Tabs switch the grid between active and completed; featured hero shows only on Active.
- Filters and sort apply live (client- or server-side query).
- Card / hero / featured click → open detail modal; ✕ or backdrop click closes it.
- Comment composer: choose sentiment (positive/neutral/concern), type text, Post → inserts a comment (in production: only for signed-in verified users, lands as `pending` for moderation, then appears and updates aggregate sentiment/score).
- Hover: cards lift with a soft shadow.

## State / data fetching
- Homepage fetches projects (with computed aggregates) and filter options from the API.
- Detail view fetches one project + its approved comments.
- Posting a comment writes to the DB and re-fetches.

---

## The "automatic" part — be realistic and phase it
True auto-aggregation of verified public-works data is the hard, ongoing part. Sources are inconsistent (PDF tenders, varied department portals, newspaper sites, social posts) and must be **de-duplicated, matched to the right project, and human-verified** before publishing. Recommended phasing:

### Build Phases
1. **Phase 1 — Live site + database + admin (do this first).** Recreate the design in Next.js, stand up Supabase, move the sample data into the DB, build the admin to add/edit projects manually, enable verified sign-in + real comments/ratings with moderation. *Now it's a real, trustworthy product, populated by hand/volunteers.*
2. **Phase 2 — Assisted ingestion.** Add scrapers/feeds for a few reliable government portals; pipe results into a **"pending review" queue** in the admin. A human approves before anything goes public. Add LLM sentiment scoring for comments.
3. **Phase 3 — Broader automation.** Add more sources (press RSS, verified social accounts via official APIs), entity-matching to link news/posts to the correct project, and automated sentiment trends — still with spot-check review.

Set expectations: Phase 1 is a few weeks; Phases 2–3 are continuous work. Legal/ToS note: scraping some sites and reposting content has terms-of-service and copyright implications — prefer official open-data/APIs and link back to sources.

---

## Design Tokens
**Fonts (Google Fonts):** Source Serif 4 (headlines), Public Sans (UI/body), IBM Plex Mono (figures/dates/IDs), Noto Serif Devanagari (the निर्माण दर्पण wordmark).

**Colors:**
- Paper background `#f4f3ee`
- Ink (text) `#232a2e`; muted slate `#5c686f`; faint `#8a8a7e` / `#a4a294`
- Pine primary `#1b5640`; deep pine (header) `#123c2c`; deepest `#0e3122`; gold accent `#e8d9a8`
- Card `#ffffff`; borders `#e7e6dd` / `#dddccf`
- Status: in-progress pine `#1b5640`; completed teal `#3f6b6e`; delayed ochre `#b3721f`
- Sentiment bars: positive `#3f9e6a`, neutral `#dcb24f`, concern `#c2664f`
- Category dots: Roads `#6b6256` · Bridges `#5a6b6f` · Hospitals `#8a5560` · Power `#4f6b4a` · Water `#4d6675` · Disaster `#8a5a44` · Tourism `#6a6440` · Schools `#5b5a7a`

**Other:** card radius 12px (hero 14px); pill radius 6px; chip radius 999px; soft shadow `0 12px 28px -16px rgba(18,60,44,.38)`.

## Assets
The prototype uses **striped placeholder boxes** with monospace captions where project photos go. Replace with real images stored in Supabase Storage (or a CDN), referenced by `image_url`.

## Files
- `Nirman Darpan.dc.html` — the high-fidelity design reference (open in a browser to see it). All 9 sample project objects and the exact layout/markup live inside this file.
