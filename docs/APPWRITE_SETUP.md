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
   - **Email/password**
   - **Magic URL** (passwordless — much friendlier for citizens)

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

## Future collections (placeholder)

- `sources` — every citation URL we accept (per-row metadata about archives + access time).
- `right_of_reply` — contractor / department responses bound to an accountability row.
- `corrections_log` — public history of what we changed, when, why.

Schemas land in this file when we build each module.
