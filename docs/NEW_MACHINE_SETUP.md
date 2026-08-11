# New-machine setup for coding with Claude Code + GitHub

A reusable checklist for standing up a fresh Windows machine to keep coding with
**Claude Code** and **GitHub** — written for this project (Nirman Darpan) but
the steps apply to any GitHub repo. The guiding principle: **your code lives in
GitHub and your data lives in the cloud, so a new machine needs almost nothing
copied — you clone and go.**

---

## TL;DR

1. Install the **Claude desktop app** (only you can — it's what runs Claude Code).
2. Install **Git** (or ask IT if the machine is locked down).
3. Copy **one folder** from the old machine if you want Claude's accumulated
   memory (optional — see §3).
4. Open Claude Code in an empty folder and paste the **first prompt** (§4).
   It handles the rest.

Everything else — cloning, git config, verifying tools, resuming work — Claude
Code does for you.

---

## 1. What you must install yourself

| Software | Needed? | How | Notes |
|---|---|---|---|
| **Claude desktop app** | Required | <https://claude.ai/download> | This *is* Claude Code — it can't install itself, so this is the one mandatory manual step. |
| **Git** | Required | `winget install Git.Git` or <https://git-scm.com> | Needs admin/UAC. On an IT-managed machine this may be blocked — ask IT to install or whitelist it. |
| **A browser** | Already there | Windows ships Edge | Chrome optional: `winget install Google.Chrome`. |

### Recommended (optional)

| Software | How | Why |
|---|---|---|
| **VS Code** | `winget install Microsoft.VisualStudioCode` | Best editor for this kind of work; has a Claude Code extension. |
| **GitHub CLI** | `winget install GitHub.cli` | Handy for PRs/issues from the terminal. |

### NOT needed for this project

- **Node.js / npm** — Nirman Darpan is a no-build static site (plain
  HTML/CSS/JS). Do **not** install a Node toolchain or run `npm install`; there
  is no build step by design. (Other projects may differ — check their README.)

---

## 2. What Claude Code can do for you vs. what it can't

| Task | Claude Code? |
|---|---|
| Install the Claude app | ❌ You only (chicken-and-egg) |
| Install Git / VS Code / gh | ⚠️ Can *attempt* via winget, but admin/UAC may block it on a managed machine |
| Set your global git identity | ✅ Fully |
| Clone the repo | ✅ Fully |
| Verify all tooling + report what's missing | ✅ Fully |
| Read project state and resume where you left off | ✅ Fully |
| Confirm nothing is un-pushed / broken | ✅ Fully |

**Bottom line:** the only hard blocker is admin rights for software installs.
Install the Claude app + Git yourself (or via IT), then one prompt does the rest.

---

## 3. What to copy from the old machine

**Source of truth is the cloud, so almost nothing is critical:**

| Item | Copy? | Where it really lives |
|---|---|---|
| The repo itself | ❌ No | GitHub — just `git clone` it fresh |
| API keys (YouTube, Google NLP, …) | ❌ No | GitHub → repo Settings → Secrets (cloud) |
| Appwrite data (comments, votes, records) | ❌ No | Appwrite Cloud |
| `.claude/` inside the repo (dev-server files) | ❌ No | Git-ignored + regenerable by Claude Code |
| **Claude Code memory + settings** | ✅ **Optional but recommended** | Local files — see below |

### The one folder worth copying: `C:\Users\<you>\.claude\`

Claude Code keeps its **memory** (accumulated facts about you and your projects)
and settings as **local files** under your user home:

```
C:\Users\<you>\.claude\                     ← copy this whole folder
C:\Users\<you>\.claude.json                 ← and this file (optional)
```

For this project that memory includes: your GitHub account, the no-install
constraint on managed machines, the project's phase/state, and your operating
preferences. Copying the folder means a fresh Claude Code session on the new
machine already knows all of it, instead of relearning from scratch.

**How to copy:** put the `.claude` folder on OneDrive / a USB drive / a zip,
and drop it into `C:\Users\<new-user>\` on the new machine before first launch.
Harmless if it turns out your Claude sign-in restores it automatically — you'd
just be overwriting identical files.

### Git credentials — nothing to copy

This project pushes over **HTTPS with Git Credential Manager** (browser
sign-in), not SSH keys. On the new machine your first `git push` simply pops a
browser GitHub sign-in — no keys to migrate.

---

## 4. First prompt on the new machine

Once the Claude app + Git are installed, open Claude Code in an **empty folder**
and paste this (swap the repo URL / project details for any other project):

> I'm setting up a new work machine to continue an existing project. The code is
> at **https://github.com/Raviknight/nirman-darpan** (I'm the owner,
> `ravikntsh@gmail.com`). This machine is fresh.
>
> Please:
> 1. Check what dev tooling is installed (git, gh, node, a browser) and report
>    versions + anything missing.
> 2. Set my global git identity: name "Ravi Sharma", email
>    "ravikntsh@gmail.com".
> 3. Clone the repo into this folder and confirm it's on `main` with a clean,
>    up-to-date working tree.
> 4. Read `README.md`, `docs/ROADMAP.md`, and `docs/APPWRITE_SETUP.md` to
>    understand the current state, then summarise: what the project is, what
>    phase we're in, and the immediate next steps.
> 5. Tell me anything you couldn't do because it needs admin rights, so I can
>    handle it or ask IT.
>
> It's a no-build static site (plain HTML/CSS/JS) — there is deliberately no
> Node/npm step, so don't try to `npm install`.

The last line stops a fresh session from assuming it's a Node project.

If you copied the `.claude` memory folder (§3), you can shorten step 4 to
*"resume where we left off — check your memory for context."*

---

## 5. If the new machine is IT-managed (locked down)

This applies if the machine has ESET / Ninja / ConnectWise agents (a corporate
build):

- Your **new** machine will likely have the **same install restrictions** as the
  old one — which is exactly why this project was built install-free (no Node,
  static hosting, cloud data).
- IT-provisioned software (antivirus, RMM agents, Office, VPN, RingCentral,
  etc.) is **re-installed by IT**, not by you — don't worry about those.
- If you **can't install Git / VS Code** yourself, options in order:
  1. Ask IT to install **Git for Windows** + **VS Code** (both are standard,
     low-risk approvals).
  2. Use **git portable** (no-install zip) extracted to your user folder.
  3. Do everything through the GitHub **web editor** (github.com → press `.` in
     the repo) — no local Git at all, though you lose Claude Code's local tools.

---

## 6. Sanity check when you're done

Ask Claude Code to run these, or run them yourself in the terminal:

```
git --version                 # Git is installed
git config --global user.name # shows "Ravi Sharma"
git -C <repo> status          # "working tree clean", "up to date with origin/main"
git -C <repo> log --oneline -3  # recent commits match GitHub
```

If all four look right, you're fully migrated and can keep coding exactly where
you left off.
