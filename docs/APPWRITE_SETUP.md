# Appwrite setup guide

A one-time, ~15-minute setup. After this the site has real persistent comments + votes + verified resident sign-in.

Why Appwrite (not Supabase): the project's 2 free Supabase slots are already in use by other apps where end-users log in. Appwrite Cloud gives 75k MAU + 2 GB DB + 2 GB storage for free, with no per-project cap. Open source, so we can self-host later if needed.

## Part A · Account + project (3 min)

1. Open **https://cloud.appwrite.io/console**.
2. Sign up (email + password, or sign in with GitHub).
3. Click **Create your first project**.
4. **Name:** `nirman-darpan`. **Region:** pick **Frankfurt** if available, otherwise closest. Click **Create**.

On the project Overview, copy:
- **Project ID** (e.g. `66f1a2b3c4d5e6...`)
- **API endpoint** (e.g. `https://fra.cloud.appwrite.io/v1`)

## Part B · Add the site as a platform (1 min)

5. Sidebar → **Settings** (gear icon) → **Platforms**.
6. **Add platform → Web** · **Name:** `Nirman Darpan` · **Hostname:** `raviknight.github.io`.
7. Repeat with **Hostname:** `localhost` so the dev server can talk to Appwrite.

## Part C · Turn on authentication (1 min)

8. Sidebar → **Auth → Settings**.
9. Enable:
   - **Email OTP** (passwordless — a 6-digit code is emailed; user types it in)
   - **Email/password** (fallback, harmless to keep on)

> **Why OTP, not Magic URL.** Magic URL emails contain a single-use link that Gmail and Outlook security scanners *pre-fetch* before the user clicks — by the time the human clicks, the token is already consumed and Appwrite returns "Invalid token." OTP avoids the problem entirely (no URL to pre-fetch). It's also the auth flow Indian users are most familiar with (every bank, telecom, food-delivery app uses it). If Magic URL is also enabled it's harmless; we just never call it from the site.

Leave Phone, OAuth, and Anonymous off.

## Part D · Create the database + collections (5 min)

10. Sidebar → **Databases → Create database**. **Name:** `main` · **Database ID:** `main`.

### Collection 1 — `comments`

Inside the database → **Create collection** · **Name:** `Comments` · **Collection ID:** `comments`.

Attributes:

| Key | Type | Size / values | Required | Default |
|---|---|---|---|---|
| `project_id` | String | 64 | ✅ | — |
| `author_id` | String | 64 | ✅ | — |
| `author_name` | String | 80 | ✅ | — |
| `location` | String | 120 | — | — |
| `sentiment` | Enum | `positive`, `neutral`, `concern` | ✅ | — |
| `text` | String | 2000 | ✅ | — |
| `status` | Enum | `pending`, `approved`, `removed` | ✅ | `pending` |

Settings → Permissions:
- `any` → Read
- `users` → Create, Update, Delete

Toggle **Document Security: enabled** (enforces "edit/delete only your own").

Indexes:
- `by_project_status` · Type: `key` · Attributes: `project_id (ASC)`, `status (ASC)`.

### Collection 2 — `votes`

**Create collection** · **Name:** `Votes` · **Collection ID:** `votes`.

Attributes:

| Key | Type | Size / range | Required |
|---|---|---|---|
| `project_id` | String | 64 | ✅ |
| `user_id` | String | 64 | ✅ |
| `direction` | Integer | min -1, max 1 | ✅ |

Settings → Permissions:
- `any` → Read
- `users` → Create, **Update**, **Delete**

> **For Phase 2.2 (voting widget):** add **Update** and **Delete** to `users` so a resident can change their vote or remove it. Then toggle **Row security: ON** at the top of the same Settings tab — that enforces "you can only update / delete your own vote row" via the row-level permissions the client sets on create.

Indexes:
- `one_vote_per_user_per_project` · Type: **`unique`** · Attributes: `project_id (ASC)`, `user_id (ASC)`.

That unique index is the database-level ballot-stuffing prevention.

## Part E · Storage bucket (1 min)

11. Sidebar → **Storage → Create bucket** · **Name:** `Evidence` · **Bucket ID:** `evidence`.
12. Permissions: `any` Read · `users` Create.
13. Allowed extensions: `jpg, jpeg, png, webp, pdf`. Max file size: `5 MB`.

## Part F · Paste two values into the repo

Open `data/config.js`. Replace the placeholders:

```js
window.NIRMAN_APPWRITE = {
  endpoint:   "https://fra.cloud.appwrite.io/v1",   // ← from Part A
  projectId:  "PASTE_PROJECT_ID_HERE",              // ← from Part A
  databaseId: "main",
  collections: {
    comments: "comments",
    votes:    "votes",
  },
  buckets: {
    evidence: "evidence",
  },
};
```

Commit and push:

```
git add data/config.js
git commit -m "Wire Appwrite credentials"
git push
```

The site reads `data/config.js` on every load. If `projectId` is still the placeholder, the site stays in in-memory mode. Once it's a real ID, the site switches to live Appwrite — sign-in is enabled, comments persist, votes count.

---

## Phase 2.3 — Accountability module table

One unified table covers all five accountability categories (Incidents / Defects / Audits / Grievances / Litigation) — easier to set up, simpler permissions, simpler moderation. Categorisation is a field on the row, not a separate table.

### Table 3 — `accountability_entries`

Inside the `main` database → **Create table** · **Name:** `Accountability entries` · **Table ID:** `accountability_entries`.

Columns:

| Key | Type | Size / values | Required | Default |
|---|---|---|---|---|
| `project_id` | String | 64 | ✅ | — |
| `category` | Enum | `incident`, `defect`, `audit`, `grievance`, `litigation` | ✅ | — |
| `title` | String | 200 | ✅ | — |
| `summary` | String | 2000 | — | — |
| `date_occurred` | Datetime | — | — | — |
| `source_url` | String | 1000 | — | — |
| `severity` | Enum | `low`, `medium`, `high` | — | `medium` |
| `status` | Enum | `open`, `addressed`, `disputed` | ✅ | `open` |
| `author_id` | String | 64 | ✅ | — |
| `verified` | Boolean | — | ✅ | `false` |

**Settings → Permissions:**
- `any` → ✅ Read
- `users` → ✅ Create, Update, Delete

Toggle **Row security: ON** at the top — so a submitter can edit / delete their own row but can't touch others'.

**Indexes** (create both):
- `by_project_category` · Type: `key` · Columns: `project_id (ASC)`, `category (ASC)`.
- `by_project_date` · Type: `key` · Columns: `project_id (ASC)`, `date_occurred (DESC)`.

That's it for the table. The site already references it as `accountability` in `data/config.js`.

---

## Phase 2.x — Keeping the project awake

Appwrite Cloud's free tier pauses any project with no API activity for 7 consecutive days. For a low-traffic civic site that's a real headache — you'd have to manually resume it before any sign-in works.

**We solve this in the sync workflow itself.** `.github/workflows/sync.yml` runs on Mon + Thu (every 3–4 days) and includes a "Keep Appwrite project active" step that makes three lightweight, unauthenticated reads against the project's public collections. Each read counts as activity; three across three collections + the health endpoint is comfortably enough to keep the project marked live.

No cost — Appwrite doesn't bill on read count, and even if they did, three requests twice a week is inside every free tier ever written. If you fork this repo for another state, update the `PROJECT_ID` and `DB_ID` values in that workflow step to match your Appwrite project.

If you notice the project got paused anyway (e.g., you disabled the workflow for a while), just resume it once in the Appwrite Console → Overview → Resume. The next cron tick keeps it live from then on.

---

## Phase 2.x — Email deliverability (sign-in links → inbox, not spam)

Appwrite Cloud's default outbound sender (`noreply@appwrite.io` or similar) has weak email-reputation against Gmail / Outlook spam filters. First-time recipients usually find the magic-link email in **Spam / Promotions**. Two fixes, in order of how much they help:

### Quick mitigation (no setup)
- The sign-in card already warns users to check spam.
- Recipients can "Mark as not spam" + add the sender to contacts; future emails land in inbox.

### Proper fix (Brevo SMTP, free tier — ~10 minutes)

1. Sign up free at <https://www.brevo.com/> (formerly Sendinblue).
2. Brevo dashboard → **SMTP & API → SMTP** → copy:
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** your Brevo SMTP username (an email-looking string)
   - **Password:** your Brevo SMTP key (you generate it on the SMTP page)
3. Brevo dashboard → **Senders** → **Add a sender** → use any email you control (e.g. `ravikntsh@gmail.com`). Brevo sends a verification email; click it.
4. Appwrite Console → your `nirman-darpan` project → **Settings → SMTP**:
   - Enable **Custom SMTP server**
   - Host / Port / Login / Password from step 2
   - **Sender email:** the one you verified in step 3
   - **Sender name:** `Nirman Darpan`
   - Save.
5. Test from the site: click **Sign in** → enter your email → check inbox.

Brevo free tier: 300 emails / day, no domain verification needed for the basic setup. That's enough for hundreds of resident sign-ins per day.

### Better fix (custom domain — when you get one)

After buying `nirmandarpan.in` or similar:
1. Add the domain to Brevo → verify DKIM + SPF (Brevo gives you the DNS records).
2. Update Appwrite SMTP sender to `noreply@nirmandarpan.in`.
3. Emails now arrive from your own domain — inbox placement near 100%.

---

## Phase 4.x — Resident project suggestions table

Residents can suggest projects we don't track yet (footer → "＋ Suggest a project"). Submissions land in the Editorial Queue for Accept / Reject.

### Table 4 — `project_suggestions`

Inside the `main` database → **Create table** · **Name:** `Project suggestions` · **Table ID:** `project_suggestions`.

Columns:

| Key | Type | Size / values | Required | Default |
|---|---|---|---|---|
| `name` | String | 200 | ✅ | — |
| `district` | Enum | `Bilaspur`, `Chamba`, `Hamirpur`, `Kangra`, `Kinnaur`, `Kullu`, `Lahaul-Spiti`, `Mandi`, `Shimla`, `Sirmaur`, `Solan`, `Una`, `Statewide` | ✅ | — |
| `category` | String | 100 | — | — |
| `description` | String | 2000 | — | — |
| `source_url` | String | 1000 | — | — |
| `author_id` | String | 64 | ✅ | — |
| `status` | Enum | `pending`, `accepted`, `rejected` | ✅ | `pending` |

> `district` is an enum (not free text) so misspellings can't enter the data even via direct API calls. The values above exactly match what the site's dropdown submits — spelling matters, including the hyphen in `Lahaul-Spiti`.

**Settings → Permissions:**
- `users` → ✅ Read, Create, Update

Toggle **Row security: ON**. (Read/Update are granted to signed-in users at the row level so the editor can change status from the queue; tightens to the `moderators` team in Phase 4.6.)

**Index:** `by_status` · Type: `key` · Columns: `status (ASC)`.

Accepting a suggestion in the queue only marks it — the editor then adds the project to `data/projects.js` with full sourcing, which is what actually publishes it.

---

## Phase 4.x — Moderation actions table (cross-device reject memory)

When the editor rejects a suggestion in the Editorial Queue, the rejection is remembered in the browser's localStorage — which means rejections don't carry across devices, and clearing browser data resurrects the whole queue. This small table fixes that.

### Table 5 — `moderation_actions`

Inside the `main` database → **Create table** · **Name:** `Moderation actions` · **Table ID:** `moderation_actions`.

Columns:

| Key | Type | Size / values | Required |
|---|---|---|---|
| `kind` | Enum | `reject` | ✅ |
| `key` | String | 1000 | ✅ |
| `author_id` | String | 64 | ✅ |

**Settings → Permissions:**
- `users` → ✅ Read, Create

Toggle **Row security: ON**.

**Index:** `by_kind` · Type: `key` · Columns: `kind (ASC)`.

The queue degrades gracefully to localStorage-only until this table exists.

---

## Future collections (placeholder)

- `sources` — every citation URL we accept (per-row metadata about archives + access time).
- `right_of_reply` — contractor / department responses bound to an accountability row.
- `corrections_log` — public history of what we changed, when, why.

Schemas land in this file when we build each module.
