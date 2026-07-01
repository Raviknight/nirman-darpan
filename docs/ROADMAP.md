# Nirman Darpan — bird's-eye roadmap

**Mission:** an independent, citation-backed record of public-works projects in Himachal Pradesh, useful to residents, journalists and officials in roughly that order, free at the point of use, run with explicit editorial oversight.

This file is the project's single source of truth on **what we are building, why, in what order, and who owns each step.** It is updated when scope changes. Past commits show what was real on any given day.

---

## Status snapshot — 19 June 2026

| Phase | Status | Visible result |
|---|---|---|
| **1. Foundation** | Done | Live site at https://raviknight.github.io/nirman-darpan/ — 32 projects across all 12 districts, with map, list, filters, per-project static pages, district pages, sitemap, Atom feed, editorial pages (`/about/`, `/methodology/`, `/corrections/`, `/privacy/`, `/funding/`, `/code-of-conduct/`). |
| **2. Participation** | Done — pending owner steps | Email-OTP sign-in, persistent comments, 1-vote-per-resident voting. **Blocked on owner:** enable Email OTP in Appwrite Console + create `accountability_entries` table per `docs/APPWRITE_SETUP.md`. |
| **3. Press aggregation** | Done | Per-project press snapshot from Google News (en-IN + hi-IN), refreshed Mon + Thu, surfaced as "Public conversation" with off-topic flagging. |
| **4. Editorial workflow** | **Now / next** | Auto-detection from press already runs server-side; surfaced suggestions move to a moderator-only Editorial Queue. Public sees only verified records. |
| **5. Distribution** | Sequenced behind 4 | Custom domain, Search Console, press emails, Wikipedia citations, social handles. |
| **6. Federation & scale** | Long-tail | Replication kit for other states, broader source list, possible newsletter, possible paid sentiment engine. |

---

## Phase 1 — Foundation **(done)**

The project exists, can be visited, can be cited, can be shared.

| Step | Done? | Notes |
|---|---|---|
| 1.1 Site scaffold (no build step, GH Pages hosting) | ✅ | `index.html` + `app.js` |
| 1.2 32-project curated dataset across all 12 districts | ✅ | `data/projects.js` |
| 1.3 HP-only SVG map (choropleth + project pins) | ✅ | No India outline; politically inert by construction |
| 1.4 Filter / search / sort / district click-to-filter | ✅ | |
| 1.5 Per-project static pages `/projects/<id>/` | ✅ | Generated; canonical for SEO |
| 1.6 District pages `/districts/<name>/` | ✅ | Generated |
| 1.7 Editorial pages | ✅ | 6 pages live |
| 1.8 sitemap.xml + robots.txt + Atom feed | ✅ | 52 URLs in sitemap |
| 1.9 JSON-LD structured data | ✅ | Article + Place + Dataset |
| 1.10 OG share image + social card meta | ✅ | |
| 1.11 Custom 404 + A11Y pass | ✅ | |
| **Owner** | Engineering (executing) + Ravi (curating) | |

---

## Phase 2 — Participation **(done in code, blocked on cloud setup)**

Verified residents can comment, vote and submit accountability flags. Real signal, not anonymous theatre.

| Step | Done? | Owner | Blocking |
|---|---|---|---|
| 2.1 Appwrite project + platforms + auth methods | ✅ | Ravi | done |
| 2.2 Email OTP code path (replaces fragile Magic URL) | ✅ in code | Ravi to enable | toggle Email OTP in Appwrite Console → Auth → Settings |
| 2.3 `comments` table + permissions + row security | ✅ | Ravi | done |
| 2.4 `votes` table + unique index | ✅ | Ravi | needs Update + Delete + Row Security flags (see `docs/APPWRITE_SETUP.md`) |
| 2.5 `accountability_entries` table | code expects it | Ravi | **not yet created** — schema in `docs/APPWRITE_SETUP.md` Phase 2.3 |
| 2.6 Brevo SMTP for sign-in email deliverability | not yet | Ravi | ~10-min Brevo signup, then 4 fields into Appwrite SMTP settings (see `docs/APPWRITE_SETUP.md` Phase 2.x) |
| **Definition of done** | Visitor signs in via OTP, the email lands in inbox (not spam), they can post a comment and vote, all of it persists across refresh, accountability submissions land as `pending review`. | | |

---

## Phase 3 — Press aggregation **(done)**

Every project has a per-project view of what the Indian press is saying.

| Step | Done? | Notes |
|---|---|---|
| 3.1 `social_queries` per project (English + Hindi phrases) | ✅ | |
| 3.2 Google News (India) RSS pull, Mon + Thu cron, push-trigger | ✅ | `scripts/social_sync.mjs` + `.github/workflows/sync.yml` |
| 3.3 Per-project snapshot at `data/social/<id>.json` | ✅ | regenerated each sweep |
| 3.4 "Public conversation" panel in modal + per-project page | ✅ | links to publisher, never reposts text |
| 3.5 Off-topic flag (localStorage now; Appwrite team-shared in Phase 4) | ✅ partial | per-browser only |
| 3.6 Tighten queries to reduce false positives | ✅ | 10 projects tightened; ongoing |

---

## Phase 4 — Editorial workflow **(now / next)**

This is what makes Nirman Darpan look run by people, not by a bot. **The most important phase that is not yet done.**

The principle: **operational data is private; published data is editor-confirmed.** Auto-detection runs in the background; the public only sees what the editor has signed off on.

| Step | Status | Owner | What it produces |
|---|---|---|---|
| 4.1 Hide raw auto-detected suggestions from public site | ✅ this commit | Engineering | Cleaner Accountability panel; the "auto-pulled / no one's home" feel is gone |
| 4.2 Reframe panel copy: "editor reviews press weekly", "verified findings only" | ✅ this commit | Engineering | Public messaging is now explicit that there is an editor |
| 4.3 Detect missing-table error gracefully (no broken submit dialogs) | ✅ this commit | Engineering | Done; banner appears in Accountability panel until the table exists |
| 4.4 Create Appwrite `moderators` team + add Ravi as the first member | ⏸ blocked | Ravi | Required for next steps. ~30 seconds in Appwrite console. |
| 4.5 Editorial Queue page at `/admin/queue/`, gated by `moderators` team membership | ⏸ behind 4.4 | Engineering | Lists every suggestion across every project; per-row Approve / Edit / Reject buttons; writing Approve creates a real `accountability_entries` row with `verified: true`. |
| 4.6 Persisted "rejected as off-topic" list (Appwrite team-shared) | ⏸ behind 4.4 | Engineering | Off-topic flags survive sweeps and apply to all users, not just one browser. |
| 4.7 Editorial decisions log at `/corrections/` | ⏸ behind 4.4 | Engineering | Public list of "approved on X", "rejected on Y because Z". Adds visible institutional memory. |
| 4.8 Right-of-reply workflow for contractors / officials | ⏸ behind 4.4 | Engineering | Email-verified replies publish next to entries they answer. |
| **Definition of done** | A visitor sees only verified findings + the editor's name; the editor handles all submissions through a single in-browser queue; every approval / rejection is dated and traceable. | | |

---

## Phase 5 — Distribution **(sequenced, mostly owner action)**

After Phase 4 the site is professional. Phase 5 is getting it in front of people.

| Step | Status | Owner | Notes |
|---|---|---|---|
| 5.1 Custom domain (`nirmandarpan.in` or similar) | ⏸ | Ravi | ~₹700/year; I wire CNAME + canonical the moment you have it |
| 5.2 Google Search Console submission | ✅ | Ravi | Verification tag in `index.html` — Ravi to click Verify + submit sitemap |
| 5.3 Bing Webmaster Tools (import-from-Google) | ⏸ | Ravi | 2 clicks once Search Console is live |
| 5.4 Press pitch round 1 (Tribune, HT, Indian Express, Divya Himachal, Amar Ujala) | ⏸ | Ravi | Drafts ready in `docs/OUTREACH.md` |
| 5.5 Wikipedia citations on relevant project articles | ⏸ | Ravi | List + template in `docs/OUTREACH.md` — one a day for two weeks |
| 5.6 Social handles + first 8 posts | ⏸ | Ravi | Bios + scripts in `docs/SOCIAL_MEDIA_KIT.md` |
| 5.7 Civil-society outreach (MKSS, ADR, Factly, DAKSH, CMS) | ⏸ | Ravi | Drafts in `docs/OUTREACH.md` |
| 5.8 Press follow-up sequence (D+7, D+14) | ⏸ | Ravi | In `docs/OUTREACH.md` |

---

## Phase 6 — Federation & scale **(long-tail)**

Once Nirman Darpan is established and stable, the architecture is reusable for other states / sectors.

| Step | Notes |
|---|---|
| 6.1 Replication kit (docs/PORTABILITY.md) | One-page recipe for another developer to point the codebase at another state |
| 6.2 Photo layer | Wikimedia / gov CC photos per project where they exist, attributed properly |
| 6.3 RSS-based ingestion expansion | Add CAG report RSS, PIB releases, official department feeds |
| 6.4 Multi-state mode (optional, distant) | One repo can serve multiple states; rename to `<state> Darpan` per deployment |
| 6.5 Newsletter (weekly digest) | Behind Brevo SMTP; ties into Phase 5 distribution |
| 6.6 Mobile app | Far future — only if data the web can't deliver justifies it |

---

## How data is stored — and why

Each kind of data lives where it should:

| Data | Lives in | Mutates how | Why this and not the other |
|---|---|---|---|
| **Project records** (32 facts: name, contractor, dates, budgets, leads, sources) | `data/projects.js` — flat JS file in git | Hand-edited by Ravi via PR or direct commit | Tiny dataset; git history IS the audit log; commits document who-changed-what-when |
| **Press snapshots** (raw aggregation per project) | `data/social/<id>.json` — regenerated end-to-end each sweep | Workflow overwrites entirely Mon + Thu | Volatile, derived, valueless if stale — full regen is correct here |
| **Auto-detected accountability suggestions** | `data/accountability_suggestions/<id>.json` — regenerated each sweep | Workflow overwrites entirely | Operational, not editorial. Lives in repo so the Editorial Queue can read it. Public never sees it. |
| **Verified accountability entries** | Appwrite `accountability_entries` table | Editor approves a suggestion (or a resident submission) → row written with `verified: true`. Edits + soft-deletes preserved. | Long-lived, editor-owned, survives sweeps. The public record. |
| **Comments / votes** | Appwrite `comments` / `votes` tables | Live, user-generated | Real-time updates; per-user permissions; can't live in repo without per-comment commits (silly) |
| **Off-topic flags (current)** | `localStorage` per browser | Per-user toggle | Quick fix; works without admin |
| **Off-topic flags (Phase 4)** | Appwrite team-shared `hidden_mentions` collection | Editor decision | Survives across users + sweeps |

**The single architectural rule:** if a piece of data is editorial (read by the public as fact), it lives in Appwrite with editor permissions. If it is operational (intermediate, fed back through a moderator), it lives in repo files. Editors move things across the boundary deliberately.

This answers your question directly: yes, we regenerate from scratch — but only the raw / operational layer. The verified layer is stable and editor-owned. The current website mixed these two, which is the issue you spotted. Phase 4 fixes it.

---

## Who owns what

| Role | Person | What they do |
|---|---|---|
| **Editor / project owner** | Ravi Sharma | Decides what projects to track; reviews the editorial queue; signs off on accountability findings; maintains the corrections log; runs distribution. |
| **Engineering** | Ravi | Builds + maintains the code; runs scheduled jobs; ships features per this roadmap. |
| **Moderators (Phase 4+)** | Ravi initially; expand to ~3 trusted volunteers later | Triage editorial queue items; approve / reject / edit; respond to right-of-reply requests. |
| **Contributors (Phase 4+)** | Verified residents who sign in | Comments, votes, accountability submissions with source URL. |

There is always a person between the data and the reader. That is the design.

---

## How this document is maintained

When scope changes — a new phase, a stepped-on assumption, a feature dropped — update the table here in the same commit that ships the change. The git history shows the trajectory.
