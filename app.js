// Nirman Darpan — vanilla JS app (no build step)
// Data, state, render functions, and event wiring.

const INR = (n) => '₹' + Number(n).toLocaleString('en-IN') + ' Cr';
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CAT_COLOR = {
  'Roads & highways':      '#6b6256',
  'Bridges & tunnels':     '#5a6b6f',
  'Hospitals & health':    '#8a5560',
  'Power & hydro':         '#4f6b4a',
  'Water & sanitation':    '#4d6675',
  'Disaster recovery':     '#8a5a44',
  'Tourism infrastructure':'#6a6440',
  'Schools & education':   '#5b5a7a',
};
const CATS = Object.keys(CAT_COLOR);


const D = window.NIRMAN_PROJECTS || [];
const FEATURED_ID = window.NIRMAN_FEATURED_ID || (D[0] && D[0].id);
const LEVEL_LABEL = { center: 'Centre', state: 'State', district: 'District' };
const LEVEL_BADGE_BG = { center: '#e8eef4', state: '#eef4ec', district: '#f5eee4' };
const LEVEL_BADGE_FG = { center: '#3a5a7d', state: '#3f6b4a', district: '#7d5a3a' };


function formatIST(date){
  const fmt = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Kolkata',
  });
  const parts = fmt.formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value || '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} IST`;
}

// Try the cron-written timestamp first; fall back to current time (e.g. when loaded via file://).
async function resolveSyncTime(){
  try {
    const r = await fetch('data/meta.json', { cache: 'no-store' });
    if (r.ok) {
      const m = await r.json();
      if (m && m.synced_at) return formatIST(new Date(m.synced_at));
    }
  } catch (_) {}
  return formatIST(new Date());
}

// ---- state ----
const state = {
  tab: 'active',
  category: 'All',
  district: 'All',
  level: 'All',
  q: '',
  sort: 'attention',
  selectedId: null,
  draftSentiment: 'positive',
  draftText: '',
  commentsById: Object.fromEntries(D.map(p => [p.id, p.comments.slice()])),
  mapMode: 'districts',
  mapMetric: 'count',
};

function fillColor(p){
  if (p.status === 'completed') return '#3f6b6e';
  return p.delayed ? '#b3721f' : '#1b5640';
}

function initials(name){
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase();
}

// SEO / share helpers: per-project page title + OG meta + deep-link URL.
const SITE_BASE = 'https://raviknight.github.io/nirman-darpan/';

function syncMetaForProject(p){
  if (p) {
    const title = `${p.name} · ${p.districtLabel} · Nirman Darpan`;
    document.title = title;
    setMeta('og:title', title);
    setMeta('twitter:title', title);
    const desc = `${p.name} — ${p.status === 'completed' ? 'Completed' : (p.delayed ? 'Behind schedule' : 'In progress')} · ₹${p.budget.toLocaleString('en-IN')} Cr outlay · ${p.contractor}. Tracked on Nirman Darpan, an independent civic-transparency project for Himachal Pradesh.`;
    setMeta('description', desc.slice(0, 300));
    setMeta('og:description', desc.slice(0, 300));
    setMeta('og:url', SITE_BASE + '?project=' + encodeURIComponent(p.id));
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.href = SITE_BASE + '?project=' + encodeURIComponent(p.id);
  } else {
    document.title = 'Nirman Darpan · Himachal Pradesh Public Works Tracker';
    setMeta('og:title', 'Nirman Darpan — Himachal Pradesh Public Works');
    setMeta('twitter:title', 'Nirman Darpan — Himachal Pradesh Public Works');
    setMeta('description', 'Independent civic-transparency tracker for public works in Himachal Pradesh — status, budgets, timelines, accountable leads, accountability records, and citizen voices.');
    setMeta('og:description', 'Independent civic-transparency tracker for public works in Himachal Pradesh — status, budgets, timelines, accountability records, and citizen voices.');
    setMeta('og:url', SITE_BASE);
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.href = SITE_BASE;
  }
}

function setMeta(key, value){
  const sel = key.startsWith('og:') || key.startsWith('twitter:')
    ? `meta[property="${key}"], meta[name="${key}"]`
    : `meta[name="${key}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement('meta');
    if (key.startsWith('og:')) el.setAttribute('property', key);
    else el.setAttribute('name', key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function pushProjectUrl(id){
  const url = id ? SITE_BASE + '?project=' + encodeURIComponent(id) : SITE_BASE;
  try { history.pushState({ id }, '', url); } catch (_) {}
}

function commentsFor(id){
  if (NIRMAN_AW && NIRMAN_AW.commentsCache[id]) {
    return NIRMAN_AW.commentsCache[id].map(awDocToComment);
  }
  return state.commentsById[id] || [];
}

async function loadCommentsFromAppwrite(id){
  if (!NIRMAN_AW) return;
  try {
    await NIRMAN_AW.listComments(id);
    if (state.selectedId === id) renderModal();
    renderGrid(); // voice counts on cards may have changed
  } catch (_) { /* network blip — keep cached */ }
}

// ---- header sync ----
document.getElementById('sync-time').textContent = 'Auto-synced ' + formatIST(new Date());
resolveSyncTime().then(t => {
  document.getElementById('sync-time').textContent = 'Auto-synced ' + t;
}).catch(() => {});

// ============================================================================
// Appwrite client (Phase 2.1) — Magic-URL sign-in + persistent comments.
// When NIRMAN_APPWRITE_READY is false (placeholder Project ID), NIRMAN_AW stays
// null and the rest of the app falls back to in-memory state seamlessly.
// ============================================================================

const NIRMAN_AW = (() => {
  if (!window.NIRMAN_APPWRITE_READY || typeof Appwrite === 'undefined') return null;
  const cfg = window.NIRMAN_APPWRITE;
  const client = new Appwrite.Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
  const account = new Appwrite.Account(client);
  const databases = new Appwrite.Databases(client);
  const { Query, ID, Permission, Role } = Appwrite;

  return {
    cfg, client, account, databases, Query, ID, Permission, Role,
    user: null,
    commentsCache: {},       // projectId → Document[]
    votesCache: {},          // projectId → { up, down, myDir, myDocId, loadedAt }
    accountabilityCache: {}, // projectId → Document[]

    async refreshUser() {
      try { this.user = await this.account.get(); }
      catch (_) { this.user = null; }
      return this.user;
    },

    // Email OTP (6-digit code), not Magic URL. Magic URL tokens were being
    // pre-consumed by Gmail / Outlook security scanners before the user
    // could click — single-use tokens + scanner pre-fetch = "Invalid token"
    // every time. OTP avoids the problem entirely (no URL to pre-fetch) and
    // is a friendlier flow for Indian users used to bank/telecom OTPs.
    async sendEmailOTP(email) {
      const token = await this.account.createEmailToken(this.ID.unique(), email);
      return { userId: token.userId };
    },

    async verifyEmailOTP(userId, code) {
      await this.account.createSession(userId, code);
      return this.refreshUser();
    },

    async signOut() {
      try { await this.account.deleteSession('current'); } catch (_) {}
      this.user = null;
    },

    async listComments(projectId) {
      const r = await this.databases.listDocuments(this.cfg.databaseId, this.cfg.collections.comments, [
        this.Query.equal('project_id', projectId),
        this.Query.notEqual('status', 'removed'),
        this.Query.orderDesc('$createdAt'),
        this.Query.limit(100),
      ]);
      this.commentsCache[projectId] = r.documents;
      return r.documents;
    },

    async loadAccountabilityEntries(projectId) {
      if (!this.cfg.collections.accountability) return [];
      try {
        const r = await this.databases.listDocuments(
          this.cfg.databaseId,
          this.cfg.collections.accountability,
          [
            this.Query.equal('project_id', projectId),
            this.Query.orderDesc('date_occurred'),
            this.Query.limit(200),
          ],
        );
        this.accountabilityCache[projectId] = r.documents;
        return r.documents;
      } catch (e) {
        // Most likely cause: the accountability_entries table doesn't exist
        // yet. Cache an empty array so the UI shows the empty state instead
        // of perpetually loading.
        this.accountabilityCache[projectId] = [];
        return [];
      }
    },

    async addAccountabilityEntry({ projectId, category, title, summary, date_occurred, source_url, severity, status }) {
      if (!this.user) throw new Error('Sign in first');
      const doc = {
        project_id: projectId,
        category,
        title,
        summary: summary || '',
        date_occurred: date_occurred || new Date().toISOString(),
        source_url: source_url || '',
        severity: severity || 'medium',
        status: status || 'open',
        author_id: this.user.$id,
        verified: false,
      };
      const perms = [
        this.Permission.read(this.Role.any()),
        this.Permission.update(this.Role.user(this.user.$id)),
        this.Permission.delete(this.Role.user(this.user.$id)),
      ];
      return this.databases.createDocument(
        this.cfg.databaseId,
        this.cfg.collections.accountability,
        this.ID.unique(), doc, perms,
      );
    },

    async loadVotes(projectId) {
      const r = await this.databases.listDocuments(this.cfg.databaseId, this.cfg.collections.votes, [
        this.Query.equal('project_id', projectId),
        this.Query.limit(5000),
      ]);
      const votes = r.documents;
      const up = votes.filter(v => v.direction === 1).length;
      const down = votes.filter(v => v.direction === -1).length;
      const mine = this.user ? votes.find(v => v.user_id === this.user.$id) : null;
      if (!this.votesCache) this.votesCache = {};
      this.votesCache[projectId] = {
        up, down,
        myDir: mine ? mine.direction : null,
        myDocId: mine ? mine.$id : null,
        loadedAt: Date.now(),
      };
      return this.votesCache[projectId];
    },

    async castVote(projectId, direction) {
      if (!this.user) throw new Error('Sign in first');
      const cached = (this.votesCache && this.votesCache[projectId]) || null;
      if (cached && cached.myDocId) {
        if (cached.myDir === direction) {
          // toggle off
          await this.databases.deleteDocument(this.cfg.databaseId, this.cfg.collections.votes, cached.myDocId);
        } else {
          await this.databases.updateDocument(this.cfg.databaseId, this.cfg.collections.votes, cached.myDocId, { direction });
        }
      } else {
        const perms = [
          this.Permission.read(this.Role.any()),
          this.Permission.update(this.Role.user(this.user.$id)),
          this.Permission.delete(this.Role.user(this.user.$id)),
        ];
        await this.databases.createDocument(
          this.cfg.databaseId, this.cfg.collections.votes, this.ID.unique(),
          { project_id: projectId, user_id: this.user.$id, direction },
          perms,
        );
      }
      return this.loadVotes(projectId);
    },

    async postComment({ projectId, sentiment, text, location }) {
      if (!this.user) throw new Error('Sign in first');
      // Schema enum is positive/neutral/concern; in-memory uses 'negative'.
      const s = sentiment === 'negative' ? 'concern' : sentiment;
      const doc = {
        project_id: projectId,
        author_id: this.user.$id,
        author_name: this.user.name || this.user.email.split('@')[0],
        location: location || '',
        sentiment: s,
        text,
        status: 'approved',
      };
      const perms = [
        this.Permission.read(this.Role.any()),
        this.Permission.update(this.Role.user(this.user.$id)),
        this.Permission.delete(this.Role.user(this.user.$id)),
      ];
      return this.databases.createDocument(
        this.cfg.databaseId, this.cfg.collections.comments,
        this.ID.unique(), doc, perms,
      );
    },
  };
})();

// Map an Appwrite document into the shape the render code expects.
function awDocToComment(doc){
  const created = new Date(doc.$createdAt);
  const ago = describeAgo(created);
  // Schema enum 'concern' ↔ in-memory 'negative'. Keep the rest of the UI unchanged.
  const s = doc.sentiment === 'concern' ? 'negative' : doc.sentiment;
  return {
    name: doc.author_name || 'Anon',
    loc: doc.location || 'Verified resident',
    s,
    text: doc.text,
    date: ago,
    _aw: true,
    _pending: doc.status === 'pending',
  };
}
function describeAgo(d){
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return sec + 's ago';
  const min = Math.round(sec / 60); if (min < 60) return min + ' min ago';
  const h = Math.round(min / 60); if (h < 24) return h + 'h ago';
  const day = Math.round(h / 24); if (day < 7) return day + ' day' + (day === 1 ? '' : 's') + ' ago';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- Auth UI ----

function renderAuthUI(){
  const root = document.getElementById('auth-slot');
  if (!root) return;
  if (!NIRMAN_AW) { root.innerHTML = ''; return; }
  if (NIRMAN_AW.user) {
    const u = NIRMAN_AW.user;
    const label = (u.name && u.name.trim()) || u.email;
    root.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;background:rgba(232,217,168,.16);border:1px solid rgba(232,217,168,.25);padding:5px 10px;border-radius:999px;font-size:11px;color:#e8d9a8">
        <span style="width:7px;height:7px;border-radius:50%;background:#7fc99b"></span>
        <b style="font-weight:600">${esc(label)}</b>
        <button id="auth-signout" style="background:none;border:none;color:#cdded3;cursor:pointer;font-size:11px;text-decoration:underline">Sign out</button>
      </span>
    `;
    document.getElementById('auth-signout').addEventListener('click', async () => {
      await NIRMAN_AW.signOut();
      renderAuthUI();
      if (state.selectedId) renderModal(); // refresh composer state
    });
  } else {
    root.innerHTML = `
      <button id="auth-signin" style="background:rgba(232,217,168,.16);border:1px solid rgba(232,217,168,.25);color:#e8d9a8;padding:5px 13px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer">Sign in to comment</button>
    `;
    document.getElementById('auth-signin').addEventListener('click', openSignInCard);
  }
}

function openSignInCard(prefillMsg){
  const existing = document.getElementById('signin-overlay');
  if (existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.id = 'signin-overlay';
  wrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(18,40,30,.5);backdrop-filter:blur(3px);z-index:60;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:#fff;border-radius:12px;max-width:420px;width:100%;padding:28px;box-shadow:0 24px 60px -20px rgba(0,0,0,.4)">
        <h3 style="font-family:'Source Serif 4',serif;font-size:20px;margin:0 0 8px;font-weight:600">Sign in to Nirman Darpan</h3>
        <p style="font-size:13px;color:#5c686f;margin:0 0 16px;line-height:1.5" id="signin-helptext">
          Enter your email. We'll send you a one-time 6-digit code — no password to remember.
          Only verified residents post comments and cast votes.
        </p>
        <div id="signin-msg" style="font-size:13px;line-height:1.5;margin-bottom:12px"></div>

        <form id="signin-email-form" autocomplete="on">
          <input id="signin-email" type="email" required placeholder="you@example.com" autocomplete="email"
            style="width:100%;font-family:'Public Sans',sans-serif;font-size:14px;color:#232a2e;border:1px solid #dddccf;border-radius:7px;padding:10px 12px;outline:none;margin-bottom:12px;box-sizing:border-box" />
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" id="signin-cancel" style="font-family:'Public Sans',sans-serif;font-size:13px;background:#f4f3ee;color:#5c686f;border:1px solid #dddccf;border-radius:7px;padding:9px 16px;cursor:pointer">Cancel</button>
            <button type="submit" id="signin-send" style="font-family:'Public Sans',sans-serif;font-size:13px;font-weight:600;background:#1b5640;color:#fff;border:none;border-radius:7px;padding:9px 18px;cursor:pointer">Send code</button>
          </div>
        </form>

        <form id="signin-code-form" autocomplete="off" style="display:none">
          <input id="signin-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" required placeholder="6-digit code" autocomplete="one-time-code"
            style="width:100%;font-family:'IBM Plex Mono',monospace;font-size:20px;letter-spacing:8px;text-align:center;color:#232a2e;border:1px solid #dddccf;border-radius:7px;padding:12px;outline:none;margin-bottom:12px;box-sizing:border-box" />
          <div style="display:flex;gap:8px;justify-content:space-between;align-items:center">
            <button type="button" id="signin-resend" style="font-family:'Public Sans',sans-serif;font-size:12px;color:#5c686f;background:none;border:none;cursor:pointer;text-decoration:underline">Use a different email</button>
            <div style="display:flex;gap:8px">
              <button type="button" id="signin-cancel-2" style="font-family:'Public Sans',sans-serif;font-size:13px;background:#f4f3ee;color:#5c686f;border:1px solid #dddccf;border-radius:7px;padding:9px 16px;cursor:pointer">Cancel</button>
              <button type="submit" id="signin-verify" style="font-family:'Public Sans',sans-serif;font-size:13px;font-weight:600;background:#1b5640;color:#fff;border:none;border-radius:7px;padding:9px 18px;cursor:pointer">Verify &amp; sign in</button>
            </div>
          </div>
        </form>

        <p style="font-size:11px;color:#a4a294;margin:14px 0 0;line-height:1.5">
          By signing in you agree to keep comments specific, civil, and on the public record. Comments are public and auditable.
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  if (prefillMsg) {
    document.getElementById('signin-msg').innerHTML =
      `<div style="background:#fdf6ec;color:#7a5a1e;padding:8px 11px;border-radius:7px">${esc(prefillMsg)}</div>`;
  }
  document.getElementById('signin-email').focus();

  let pendingUserId = null;

  const close = () => wrap.remove();
  document.getElementById('signin-cancel').addEventListener('click', close);
  document.getElementById('signin-cancel-2').addEventListener('click', close);
  wrap.querySelector('div').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });

  // Step 1: send code
  document.getElementById('signin-email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    if (!email) return;
    const msg = document.getElementById('signin-msg');
    const btn = document.getElementById('signin-send');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const { userId } = await NIRMAN_AW.sendEmailOTP(email);
      pendingUserId = userId;
      msg.innerHTML = `<div style="background:#e7f0ea;color:#1b5640;padding:10px 12px;border-radius:7px;line-height:1.5">
        <b>Sent.</b> A 6-digit code is on its way to <b>${esc(email)}</b>.<br>
        <span style="color:#5c686f;font-size:12px">
          ⚠ First-time codes often land in <b>Spam / Promotions</b>. The code is valid for ~15 minutes.
        </span>
      </div>`;
      document.getElementById('signin-helptext').textContent = `Enter the 6-digit code we sent to ${email}.`;
      document.getElementById('signin-email-form').style.display = 'none';
      document.getElementById('signin-code-form').style.display = 'block';
      document.getElementById('signin-code').focus();
    } catch (err) {
      msg.innerHTML = `<div style="background:#f7e7e3;color:#b04a3a;padding:10px 12px;border-radius:7px">
        ${esc(err.message || 'Could not send the code. Try again.')}
      </div>`;
      btn.disabled = false; btn.textContent = 'Send code';
    }
  });

  // "Use a different email" — back to step 1
  document.getElementById('signin-resend').addEventListener('click', () => {
    pendingUserId = null;
    document.getElementById('signin-code-form').style.display = 'none';
    document.getElementById('signin-email-form').style.display = 'block';
    document.getElementById('signin-msg').innerHTML = '';
    document.getElementById('signin-send').disabled = false;
    document.getElementById('signin-send').textContent = 'Send code';
    document.getElementById('signin-helptext').textContent = `Enter your email. We'll send you a one-time 6-digit code — no password to remember.`;
    document.getElementById('signin-email').focus();
  });

  // Step 2: verify code
  document.getElementById('signin-code-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('signin-code').value.trim();
    if (!code || !pendingUserId) return;
    const msg = document.getElementById('signin-msg');
    const btn = document.getElementById('signin-verify');
    btn.disabled = true; btn.textContent = 'Verifying…';
    try {
      await NIRMAN_AW.verifyEmailOTP(pendingUserId, code);
      wrap.remove();
      renderAuthUI();
      if (state.selectedId) renderModal();
    } catch (err) {
      msg.innerHTML = `<div style="background:#f7e7e3;color:#b04a3a;padding:10px 12px;border-radius:7px">
        ${esc(err.message || 'Code did not work. Try again, or request a new one.')}
      </div>`;
      btn.disabled = false; btn.textContent = 'Verify & sign in';
      document.getElementById('signin-code').select();
    }
  });
}

// Bootstrap: just rehydrate the session if cookies exist. (We used to handle
// a Magic-URL redirect here, but switched to Email OTP — see sendEmailOTP in
// NIRMAN_AW for why. No URL params to process anymore.)
async function bootstrapAppwrite(){
  if (!NIRMAN_AW) { renderAuthUI(); return; }
  // Legacy: if someone clicks an old Magic URL link, strip the params so it
  // doesn't dangle on the URL. We don't try to consume the token.
  const params = new URLSearchParams(window.location.search);
  if (params.has('userId') && params.has('secret')) {
    const projectParam = params.get('project');
    const clean = window.location.origin + window.location.pathname + (projectParam ? '?project=' + encodeURIComponent(projectParam) : '');
    window.history.replaceState({}, '', clean);
  }
  try { await NIRMAN_AW.refreshUser(); } catch (_) {}
  renderAuthUI();
  if (state.selectedId) renderModal();
}

// ---- stats ----
function renderStats(){
  const active = D.filter(p => p.status === 'active');
  const completed = D.filter(p => p.status === 'completed');
  const totalBudget = D.reduce((a,p) => a + p.budget, 0);
  const delayed = active.filter(p => p.delayed).length;

  document.getElementById('stats').innerHTML = `
    <div class="stat">
      <div class="stat-label">Active</div>
      <div class="stat-value" style="color:#1b5640">${active.length}</div>
      <div class="stat-sub">projects in progress</div>
    </div>
    <div class="stat">
      <div class="stat-label">Completed</div>
      <div class="stat-value" style="color:#3f6b6e">${completed.length}</div>
      <div class="stat-sub">delivered &amp; archived</div>
    </div>
    <div class="stat">
      <div class="stat-label">Tracked outlay</div>
      <div class="stat-value">₹${(totalBudget/1000).toFixed(1)}K Cr</div>
      <div class="stat-sub">reported · unverified</div>
    </div>
    <div class="stat">
      <div class="stat-label">Districts covered</div>
      <div class="stat-value" style="color:#3a5a7d">12</div>
      <div class="stat-sub">all of Himachal Pradesh</div>
    </div>
    <div class="stat flag">
      <div class="stat-label">Flagged</div>
      <div class="stat-value" style="color:#b3721f">${delayed}</div>
      <div class="stat-sub">behind schedule</div>
    </div>
  `;

  document.getElementById('count-active').textContent = active.length;
  document.getElementById('count-completed').textContent = completed.length;
}

// ---- featured ----
function renderFeatured(){
  const wrap = document.getElementById('featured-wrap');
  if (state.tab !== 'active') { wrap.innerHTML = ''; return; }
  const p = D.find(x => x.id === FEATURED_ID);
  if (!p) { wrap.innerHTML = ''; return; }
  const c = CAT_COLOR[p.category] || '#5c686f';
  const fc = fillColor(p);
  wrap.innerHTML = `
    <section class="featured" data-open="${p.id}">
      <div class="featured-img">
        <span class="badge">★ Featured activity</span>
        <span class="caption">${esc(p.img)}</span>
      </div>
      <div class="featured-body">
        <div class="feat-cat-row">
          <span class="feat-cat"><span class="dot" style="background:${c}"></span>${esc(p.category)}</span>
          <span class="feat-id">${esc(p.id)}</span>
        </div>
        <h2 class="featured-title">${esc(p.name)}</h2>
        <p class="featured-desc">${esc(p.desc)}</p>
        <div class="feat-status">
          <span class="pill-progress">In progress</span>
          ${p.delayed ? `<span class="pill-delay">⚠ Behind schedule</span>` : ''}
        </div>
        <div style="margin-bottom:18px">
          <div class="feat-prog-row"><span>Progress</span><b>${p.progress}%</b></div>
          <div class="feat-prog-bar"><div style="width:${p.progress}%;background:${fc};height:100%;border-radius:999px"></div></div>
        </div>
        <div class="feat-grid">
          <div><div>Started</div><div>${esc(p.start)}</div></div>
          <div><div>Revised ETA</div><div style="color:#b3721f">${esc(p.eta)}</div></div>
          <div><div>Outlay</div><div>${INR(p.budget)}</div></div>
        </div>
      </div>
    </section>
  `;
}

// ---- filter controls (district options + chips) ----
function renderDistrictOptions(){
  const districts = [...new Set(D.flatMap(p => p.dists))].sort();
  const sel = document.getElementById('district');
  sel.innerHTML = `<option value="All">All districts</option>` +
    districts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  sel.value = state.district;
}

function renderChips(){
  const cats = ['All', ...CATS];
  document.getElementById('chips').innerHTML = cats.map(c => {
    const on = state.category === c;
    const col = c === 'All' ? '#9a9888' : (CAT_COLOR[c] || '#9a9888');
    return `<button class="chip ${on?'on':''}" data-cat="${esc(c)}">
      <span class="dot" style="background:${on ? '#ffffff' : col}"></span>${esc(c)}
    </button>`;
  }).join('');
}

function renderTabs(){
  document.getElementById('tab-active').classList.toggle('on', state.tab === 'active');
  document.getElementById('tab-completed').classList.toggle('on', state.tab === 'completed');
}

// ---- grid ----
function visibleList(){
  let list = D.filter(p => p.status === state.tab);
  if (state.tab === 'active') list = list.filter(p => p.id !== FEATURED_ID);
  if (state.category !== 'All') list = list.filter(p => p.category === state.category);
  if (state.district !== 'All') list = list.filter(p => p.dists.includes(state.district));
  if (state.level !== 'All') list = list.filter(p => p.level === state.level);
  const q = state.q.trim().toLowerCase();
  if (q) {
    list = list.filter(p =>
      (p.name + ' ' + ((p.contractors && p.contractors.join(' ')) || p.contractor || '') + ' ' + p.districtLabel + ' ' + p.category).toLowerCase().includes(q)
    );
  }
  if (state.sort === 'attention') {
    list = [...list].sort((a,b) => ((a.delayed?0:1) - (b.delayed?0:1)) || (a.sentiment.p - b.sentiment.p));
  } else if (state.sort === 'progress') {
    list = [...list].sort((a,b) => b.progress - a.progress);
  } else if (state.sort === 'budget') {
    list = [...list].sort((a,b) => b.budget - a.budget);
  } else if (state.sort === 'discussed') {
    list = [...list].sort((a,b) => b.ratings - a.ratings);
  }
  return list;
}

function renderGrid(){
  const list = visibleList();
  const grid = document.getElementById('grid');
  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <h3>No activities match these filters</h3>
        <p>Try clearing the search or choosing a different district.</p>
      </div>
    `;
    return;
  }
  grid.innerHTML = list.map(p => {
    const c = CAT_COLOR[p.category] || '#5c686f';
    const fc = fillColor(p);
    const completed = p.status === 'completed';
    const etaLabel = completed ? ('Done ' + (p.completed || p.eta)) : ('ETA ' + p.eta);
    const cmCount = commentsFor(p.id).length;
    const ratingsFmt = (p.ratings + cmCount).toLocaleString('en-IN');
    const lvl = p.level || 'center';
    const lvlBadge = `<span class="level-tag" style="background:${LEVEL_BADGE_BG[lvl]};color:${LEVEL_BADGE_FG[lvl]}">${LEVEL_LABEL[lvl]}</span>`;
    return `
      <article class="card" data-open="${esc(p.id)}">
        <div class="card-img">
          <span class="card-cat"><span class="dot" style="background:${c}"></span>${esc(p.category)}</span>
          <span class="status-pill ${completed?'completed':'active'}">${completed?'Completed':'In progress'}</span>
        </div>
        <div class="card-body">
          <div class="card-row">
            <span class="card-meta">◎ ${esc(p.districtLabel)} ${lvlBadge}</span>
            <span class="card-id">${esc(p.id)}</span>
          </div>
          <h3 class="card-title">${esc(p.name)}</h3>
          <div>
            <div class="progress-row">
              <span>${p.progress}% complete</span>
              <span class="progress-eta">${esc(etaLabel)}</span>
            </div>
            <div class="bar"><div style="width:${p.progress}%;background:${fc}"></div></div>
          </div>
          ${(!completed && p.delayed) ? `<div class="delay">⚠ Running behind schedule</div>` : ''}
          <div class="card-money">
            <div><span class="card-money-label">Outlay</span> <span class="card-money-val">${INR(p.budget)}</span></div>
            <div class="card-contractor" title="${esc((p.contractors && p.contractors.length) ? p.contractors.join(' · ') : p.contractor)}">${
              (p.contractors && p.contractors.length > 1)
                ? esc(p.contractors[0]) + ' +' + (p.contractors.length - 1) + ' more'
                : esc((p.contractors && p.contractors[0]) || p.contractor)
            }</div>
          </div>
          <div class="card-foot">
            ${(p.ratings + cmCount > 0) ? `
              <div class="sent-row">
                <span class="sent-label">Public sentiment</span>
                <span class="sent-num"><strong>${p.sentiment.p}%</strong> <span>· ${ratingsFmt} voices</span></span>
              </div>
              <div class="sent-bar">
                <div style="width:${p.sentiment.p}%;background:#3f9e6a"></div>
                <div style="width:${p.sentiment.n}%;background:#dcb24f"></div>
                <div style="width:${p.sentiment.x}%;background:#c2664f"></div>
              </div>
            ` : `
              <div class="sent-row">
                <span class="sent-label">Public sentiment</span>
                <span class="sent-num" style="color:#a4a294;font-style:italic">Not yet measured · Phase 2</span>
              </div>
              <div class="sent-bar"><div style="width:100%;background:#eceae1"></div></div>
            `}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ---- modal ----

// Cache for data/social/<id>.json (filled lazily on first modal open per project).
const socialCache = {};

// Accountability categories — keep in lockstep with the schema enum.
const ACCT_CATS = [
  { key: 'incident',   label: 'Incidents',   color: '#b04a3a', desc: 'Accidents on site, fatalities, FIRs', hasSeverity: true  },
  { key: 'defect',     label: 'Defects',     color: '#b3721f', desc: 'Quality failures, audit-flagged defects, citizen-reported issues', hasSeverity: true  },
  { key: 'audit',      label: 'Audits',      color: '#3a5a7d', desc: 'CAG performance audits, PAC observations', hasSeverity: false },
  { key: 'grievance',  label: 'Grievances',  color: '#7d5a3a', desc: 'RTI references, CPGRAMS complaints', hasSeverity: false },
  { key: 'litigation', label: 'Litigation',  color: '#5b5a7a', desc: 'PILs, NGT petitions, court orders', hasSeverity: false },
];
const ACCT_CAT_BY_KEY = Object.fromEntries(ACCT_CATS.map(c => [c.key, c]));

function renderAccountabilityPanel(projectId){
  if (!NIRMAN_AW) {
    return `
      <div class="acct-panel">
        <h4 class="sect" style="margin:0 0 6px">Accountability</h4>
        <p style="font-size:13px;color:#7d8a82;line-height:1.5;margin:0">
          Tracking incidents, defects, audits, grievances and litigation per project goes live once
          Appwrite is configured — see <a href="docs/APPWRITE_SETUP.md">docs/APPWRITE_SETUP.md</a>.
        </p>
      </div>`;
  }
  const entries = NIRMAN_AW.accountabilityCache[projectId] || [];
  const open = entries.filter(e => e.status === 'open').length;
  const addressed = entries.filter(e => e.status === 'addressed').length;
  const disputed = entries.filter(e => e.status === 'disputed').length;
  const byCat = Object.fromEntries(ACCT_CATS.map(c => [c.key, []]));
  for (const e of entries) if (byCat[e.category]) byCat[e.category].push(e);
  return `
    <div class="acct-panel">
      <div class="acct-head">
        <div>
          <h4 class="sect" style="margin:0 0 4px">Accountability</h4>
          <div class="acct-sub">${entries.length} verified record${entries.length === 1 ? '' : 's'} on file · sourced + moderated</div>
        </div>
        <div class="acct-roll">
          <span class="acct-pill open">${open} open</span>
          <span class="acct-pill addressed">${addressed} addressed</span>
          ${disputed ? `<span class="acct-pill disputed">${disputed} disputed</span>` : ''}
        </div>
      </div>
      ${ACCT_CATS.map(c => renderAccountabilityBlock(projectId, c, byCat[c.key])).join('')}
      <p class="acct-foot">
        Every entry needs a source citation. User submissions land as <i>pending review</i> until a moderator confirms.
        Sourced and auditable, not just allegations.
      </p>
    </div>
  `;
}

function renderAccountabilityBlock(projectId, cat, entries){
  const openHere = entries.filter(e => e.status === 'open').length;
  const addBtn = (NIRMAN_AW && NIRMAN_AW.user)
    ? `<button type="button" class="acct-add-btn" data-add-cat="${esc(cat.key)}" data-add-pid="${esc(projectId)}">+ Add</button>`
    : '';
  const body = entries.length === 0
    ? `<div class="acct-empty">No verified entries yet${NIRMAN_AW && NIRMAN_AW.user ? ' — be the first to submit one with a source.' : '.'}</div>`
    : entries.map(renderAccountabilityEntry).join('');
  return `
    <div class="acct-block">
      <div class="acct-block-head">
        <span class="acct-cat-dot" style="background:${cat.color}"></span>
        <b>${cat.label}</b>
        <small>${cat.desc}</small>
        ${entries.length ? `<span class="acct-block-count">${entries.length}${openHere ? ` · <b style="color:#b04a3a">${openHere} open</b>` : ''}</span>` : ''}
        ${addBtn}
      </div>
      <div class="acct-list">${body}</div>
    </div>
  `;
}

function renderAccountabilityEntry(e){
  const date = e.date_occurred ? new Date(e.date_occurred).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
  const verified = e.verified
    ? `<span class="acct-verified" title="Verified by moderator">✓ verified</span>`
    : `<span class="acct-pending" title="User submission awaiting moderator review">⏵ pending review</span>`;
  const sevClass = e.severity ? `acct-sev-${e.severity}` : '';
  const statusClass = `acct-status acct-status-${e.status}`;
  return `
    <div class="acct-entry">
      <div class="acct-entry-head">
        <b>${esc(e.title)}</b>
        <span class="${statusClass}">${esc(e.status)}</span>
        ${e.severity ? `<span class="acct-sev ${sevClass}">${esc(e.severity)}</span>` : ''}
      </div>
      ${e.summary ? `<p class="acct-entry-body">${esc(e.summary)}</p>` : ''}
      <div class="acct-entry-foot">
        ${date ? `<span>${date}</span>` : ''}
        ${e.source_url ? `<a href="${esc(e.source_url)}" target="_blank" rel="noopener nofollow">Source ↗</a>` : '<span style="color:#b04a3a">⚠ no source url</span>'}
        ${verified}
      </div>
    </div>
  `;
}

function openAccountabilityForm(projectId, categoryKey){
  const cat = ACCT_CAT_BY_KEY[categoryKey];
  if (!cat) return;
  const existing = document.getElementById('acct-form-overlay');
  if (existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.id = 'acct-form-overlay';
  const isInDef = cat.hasSeverity;
  wrap.innerHTML = `
    <div class="acct-form-bg">
      <div class="acct-form-card">
        <h3>Add ${cat.label.replace(/s$/, '').toLowerCase()} for this project</h3>
        <p class="acct-form-help">${esc(cat.desc)}. Submissions land as <b>pending review</b> — a moderator confirms before promoting to verified.</p>
        <form id="acct-form">
          <label>Title <span class="req">*</span>
            <input type="text" name="title" maxlength="200" required placeholder="Short, specific, no rhetoric (≤ 200 chars)">
          </label>
          <label>Details
            <textarea name="summary" maxlength="2000" rows="4" placeholder="What happened? Specific dates, locations, names, figures, page references."></textarea>
          </label>
          <label>Source URL <span class="req">*</span>
            <input type="url" name="source_url" required placeholder="News article, RTI reply, audit PDF, court order…">
          </label>
          <div class="acct-form-row">
            <label>When did this happen?
              <input type="date" name="date_occurred">
            </label>
            <label>Status
              <select name="status">
                <option value="open" selected>Open</option>
                <option value="addressed">Addressed</option>
                <option value="disputed">Disputed</option>
              </select>
            </label>
            ${isInDef ? `
            <label>Severity
              <select name="severity">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </label>` : ''}
          </div>
          <div id="acct-form-msg"></div>
          <div class="acct-form-actions">
            <button type="button" id="acct-cancel">Cancel</button>
            <button type="submit" id="acct-submit">Submit for review</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector('.acct-form-bg').addEventListener('click', (e) => { if (e.target === e.currentTarget) wrap.remove(); });
  wrap.querySelector('#acct-cancel').addEventListener('click', () => wrap.remove());
  wrap.querySelector('input[name="title"]').focus();
  wrap.querySelector('#acct-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const submitBtn = wrap.querySelector('#acct-submit');
    const msg = wrap.querySelector('#acct-form-msg');
    submitBtn.disabled = true; submitBtn.textContent = 'Submitting…';
    try {
      await NIRMAN_AW.addAccountabilityEntry({
        projectId,
        category: categoryKey,
        title: f.title.value.trim(),
        summary: f.summary.value.trim(),
        source_url: f.source_url.value.trim(),
        date_occurred: f.date_occurred.value ? new Date(f.date_occurred.value).toISOString() : null,
        severity: f.severity ? f.severity.value : null,
        status: f.status.value,
      });
      await NIRMAN_AW.loadAccountabilityEntries(projectId);
      wrap.remove();
      renderModal();
    } catch (err) {
      submitBtn.disabled = false; submitBtn.textContent = 'Submit for review';
      msg.innerHTML = `<div class="acct-form-err">${esc((err && err.message) || 'Submission failed.')}</div>`;
    }
  });
}

function renderShareRow(p){
  const url = SITE_BASE + '?project=' + encodeURIComponent(p.id);
  const text = `${p.name} — tracked on Nirman Darpan`;
  const waUrl = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
  const twUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
  return `
    <div class="share-row">
      <button class="share-btn" type="button" data-share-copy="${esc(url)}" title="Copy project link">
        <span class="share-ico">🔗</span> Copy link
      </button>
      <a class="share-btn" href="${waUrl}" target="_blank" rel="noopener" title="Share on WhatsApp">
        <span class="share-ico">💬</span> WhatsApp
      </a>
      <a class="share-btn" href="${twUrl}" target="_blank" rel="noopener" title="Share on X / Twitter">
        <span class="share-ico">𝕏</span> Share
      </a>
    </div>
  `;
}

function renderPerceptionPanel(projectId){
  if (!NIRMAN_AW) {
    return `
      <div class="perception" style="background:#fbf8ef">
        <h4 class="sect" style="margin:0 0 4px">Public perception</h4>
        <p style="font-size:13px;color:#7d8a82;line-height:1.5;margin:0">
          Voting goes live in Phase 2. The Appwrite layer isn't configured in this build —
          see <a href="docs/APPWRITE_SETUP.md">docs/APPWRITE_SETUP.md</a>.
        </p>
      </div>`;
  }
  const v = NIRMAN_AW.votesCache[projectId] || { up: 0, down: 0, myDir: null };
  const total = v.up + v.down;
  const showPct = total >= 25;
  const upPct = total ? Math.round(v.up / total * 100) : 0;
  const downPct = 100 - upPct;
  const myFoot = !NIRMAN_AW.user
    ? `<p class="vote-meta"><a data-do-signin="1">Sign in</a> to cast your vote · one vote per verified resident per project.</p>`
    : (v.myDir
        ? `<p class="vote-meta">You voted <b>${v.myDir === 1 ? 'helpful' : 'concern'}</b>. <a data-do-unvote="1" data-dir="${v.myDir}" data-pid="${esc(projectId)}">Remove vote</a></p>`
        : `<p class="vote-meta">One vote per verified resident per project. Click again on the same button to remove.</p>`);

  return `
    <div class="perception">
      <div class="perception-top">
        <div>
          <h4 class="sect" style="margin:0">Public perception</h4>
          <div class="perception-sub">${total} verified resident vote${total === 1 ? '' : 's'}${showPct ? '' : ' · percentages hidden below 25'}</div>
        </div>
      </div>
      <div class="vote-row">
        <button class="vote-btn up ${v.myDir === 1 ? 'on' : ''}" type="button" data-vote="1" data-pid="${esc(projectId)}" aria-pressed="${v.myDir === 1}">
          <span class="vote-ico">👍</span>
          <span class="vote-count">${v.up}</span>
          <span class="vote-label">Helpful</span>
        </button>
        <button class="vote-btn down ${v.myDir === -1 ? 'on' : ''}" type="button" data-vote="-1" data-pid="${esc(projectId)}" aria-pressed="${v.myDir === -1}">
          <span class="vote-ico">👎</span>
          <span class="vote-count">${v.down}</span>
          <span class="vote-label">Concerns</span>
        </button>
      </div>
      ${showPct ? `
        <div class="perception-bar" style="margin-top:12px">
          <div style="width:${upPct}%;background:#3f9e6a"></div>
          <div style="width:${downPct}%;background:#c2664f"></div>
        </div>
        <div class="perception-legend" style="margin-top:6px">
          <span class="pos">● Helpful ${upPct}%</span>
          <span class="neg">● Concerns ${downPct}%</span>
        </div>
      ` : ''}
      ${myFoot}
    </div>
  `;
}

async function loadSocial(id){
  if (id in socialCache) return socialCache[id];
  try {
    const r = await fetch(`data/social/${encodeURIComponent(id)}.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    socialCache[id] = await r.json();
  } catch (_) {
    socialCache[id] = null;
  }
  return socialCache[id];
}

function timeAgo(iso){
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return sec + 's ago';
  const min = Math.round(sec / 60); if (min < 60) return min + ' min ago';
  const h = Math.round(min / 60); if (h < 24) return h + 'h ago';
  const day = Math.round(h / 24); if (day < 31) return day + ' day' + (day===1?'':'s') + ' ago';
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function renderSocialPanel(id){
  const data = socialCache[id];
  if (data === undefined) {
    // not loaded yet — kick off and render a placeholder
    loadSocial(id).then(() => {
      const el = document.getElementById('social-panel-' + id);
      if (el) el.innerHTML = renderSocialPanel(id);
    });
    return `<div class="social-loading">Loading public conversation…</div>`;
  }
  if (!data || !data.mentions) {
    return `<div class="social-empty">
      <h4 class="sect" style="margin:0 0 6px">Public conversation</h4>
      <p style="font-size:13px;color:#7d8a82;margin:0 0 4px;line-height:1.5">
        No mentions yet from the press-RSS sweep. Either the auto-sync workflow hasn't run since this project was added, or the query didn't match anything in the latest news pool.
      </p>
    </div>`;
  }
  const total = data.counts?.total || 0;
  const en = data.counts?.en || 0;
  const hi = data.counts?.hi || 0;
  const mentions = (data.mentions || []).slice(0, 5);
  const updated = data.updated_at ? timeAgo(data.updated_at) : '';
  const langStrip = (en + hi > 0) ? `
    <div class="social-langbar" aria-label="Language mix">
      <div style="width:${total ? Math.round(en/total*100) : 0}%;background:#3a5a7d" title="English: ${en}"></div>
      <div style="width:${total ? Math.round(hi/total*100) : 0}%;background:#7d5a3a" title="Hindi: ${hi}"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#7d8a82;margin-top:4px">
      <span><span class="dot" style="background:#3a5a7d"></span> English ${en}</span>
      <span><span class="dot" style="background:#7d5a3a"></span> Hindi ${hi}</span>
    </div>
  ` : '';
  const list = mentions.length ? mentions.map(m => `
    <a href="${esc(m.url)}" target="_blank" rel="noopener nofollow" class="social-row">
      <div class="social-row-title">${esc(m.title)}</div>
      <div class="social-row-meta">
        <span>${esc(m.source || 'News')}</span>
        ${m.date ? `<span>· ${esc(timeAgo(m.date))}</span>` : ''}
        ${m.lang === 'hi' ? `<span class="social-lang-tag hi">हिं</span>` : (m.lang === 'en' ? `<span class="social-lang-tag en">EN</span>` : '')}
      </div>
    </a>
  `).join('') : `<div style="font-size:13px;color:#7d8a82;padding:6px 0">No items yet.</div>`;
  const moreRow = (data.mentions.length > 5)
    ? `<button class="social-more" data-pid="${esc(id)}" type="button">Show all ${data.mentions.length} mentions</button>`
    : '';
  return `
    <div class="social-head">
      <div>
        <h4 class="sect" style="margin:0 0 2px">Public conversation</h4>
        <div class="social-sub">
          <b>${total}</b> press mention${total === 1 ? '' : 's'} aggregated
          ${updated ? `· refreshed ${esc(updated)}` : ''}
        </div>
      </div>
    </div>
    ${langStrip}
    <div class="social-list">${list}</div>
    ${moreRow}
    <p class="social-method">
      Aggregated from Indian press via Google News (en-IN + hi-IN).
      Headlines link to the original publisher — we do not repost text.
      No automated sentiment scoring; read the headline.
      <a href="data/sources.md" target="_blank">Methodology</a>
    </p>
  `;
}

function composerOverlay(){
  if (!NIRMAN_AW) {
    return `<div style="position:absolute;inset:0;background:rgba(255,255,255,.55);backdrop-filter:blur(1px);border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;font-size:12px;color:#5c686f;line-height:1.5;z-index:1">
      Comments will go live once verified resident sign-in is wired in <b>Phase 2</b>.<br>This composer is a preview only.
    </div>`;
  }
  if (!NIRMAN_AW.user) {
    return `<div style="position:absolute;inset:0;background:rgba(255,255,255,.78);backdrop-filter:blur(1px);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:14px;font-size:13px;color:#41474a;line-height:1.5;z-index:1;gap:10px">
      <div>Verified residents only.</div>
      <button id="composer-signin" style="font-family:'Public Sans',sans-serif;font-size:13px;font-weight:600;background:#1b5640;color:#fff;border:none;border-radius:7px;padding:9px 16px;cursor:pointer">Sign in to comment</button>
    </div>`;
  }
  return '';
}

function srcIcon(t){ return t === 'gov' ? '🏛' : t === 'press' ? '📰' : '✔'; }
function sentLabel(s){ return s === 'positive' ? 'Positive' : s === 'negative' ? 'Concern' : 'Neutral'; }
function sentTagClass(s){ return s === 'positive' ? 'pos' : s === 'negative' ? 'neg' : 'neu'; }

function renderModal(){
  const root = document.getElementById('modal-root');
  if (!state.selectedId) { root.innerHTML = ''; document.body.style.overflow = ''; syncMetaForProject(null); return; }
  const p = D.find(x => x.id === state.selectedId);
  if (!p) { root.innerHTML = ''; document.body.style.overflow = ''; syncMetaForProject(null); return; }
  document.body.style.overflow = 'hidden';
  syncMetaForProject(p);

  // Kick off async fetches from Appwrite on first open per project. Resolved
  // calls re-render the modal in place.
  if (NIRMAN_AW && !NIRMAN_AW.commentsCache[p.id]) {
    NIRMAN_AW.commentsCache[p.id] = []; // mark in-flight so we don't refetch
    loadCommentsFromAppwrite(p.id);
  }
  if (NIRMAN_AW && !NIRMAN_AW.votesCache[p.id]) {
    NIRMAN_AW.votesCache[p.id] = { up: 0, down: 0, myDir: null, myDocId: null };
    NIRMAN_AW.loadVotes(p.id)
      .then(() => { if (state.selectedId === p.id) renderModal(); })
      .catch(() => {});
  }
  if (NIRMAN_AW && !NIRMAN_AW.accountabilityCache[p.id]) {
    NIRMAN_AW.accountabilityCache[p.id] = [];
    NIRMAN_AW.loadAccountabilityEntries(p.id)
      .then(() => { if (state.selectedId === p.id) renderModal(); })
      .catch(() => {});
  }

  const c = CAT_COLOR[p.category] || '#5c686f';
  const fc = fillColor(p);
  const completed = p.status === 'completed';
  const cm = commentsFor(p.id);
  const ratings = p.ratings + cm.length;
  const ratingsFmt = ratings.toLocaleString('en-IN');
  const etaWord = completed ? 'Completed' : 'Target completion';
  const completedOrEta = completed ? (p.completed || p.eta) : p.eta;
  const etaColor = (!completed && p.delayed) ? '#b3721f' : '#232a2e';

  const leadsHtml = p.leads.map(l => `
    <div class="lead">
      <span class="lead-ini">${esc(initials(l.n))}</span>
      <div style="flex:1">
        <div class="lead-name">${esc(l.n)}</div>
        <div class="lead-role">${esc(l.r)}</div>
      </div>
    </div>
  `).join('');

  const msHtml = p.milestones.map((m,i) => `
    <div class="ms-row">
      <div class="ms-col">
        <span class="ms-dot ${m.done?'done':'todo'}">${m.done?'✓':''}</span>
        ${i < p.milestones.length - 1 ? '<span class="ms-line"></span>' : ''}
      </div>
      <div>
        <div class="ms-l ${m.done?'done':'todo'}">${esc(m.l)}</div>
        <div class="ms-d">${esc(m.d)}</div>
      </div>
    </div>
  `).join('');

  const commentsHtml = cm.map(co => `
    <div class="comment">
      <div class="comment-head">
        <span class="comment-ini">${esc((co.name[0]||'?').toUpperCase())}</span>
        <div style="flex:1">
          <div class="comment-name">${esc(co.name)}</div>
          <div class="comment-loc">${esc(co.loc)} · ${esc(co.date)}</div>
        </div>
        <span class="comment-tag ${sentTagClass(co.s)}">${esc(sentLabel(co.s))}</span>
      </div>
      <p>${esc(co.text)}</p>
    </div>
  `).join('');

  const sourcesHtml = p.sources.map(s => `
    <span class="source">${srcIcon(s.t)} ${esc(s.n)}</span>
  `).join('');

  const sentBtn = (k, cls, label) => `
    <button class="sent-btn ${cls} ${state.draftSentiment===k?'on':''}" data-sent="${k}">${label}</button>
  `;

  root.innerHTML = `
    <div class="modal-backdrop" data-close="1">
      <div class="modal" data-stop="1">
        <div class="modal-hero">
          <button class="modal-close" data-close="1" aria-label="Close">✕</button>
          <span class="modal-status status-pill ${completed?'completed':'active'}">${completed?'Completed':'In progress'}</span>
          <span class="modal-cap">${esc(p.img)}</span>
        </div>
        <div class="modal-body">
          <div class="modal-meta-row">
            <span class="cat"><span class="dot" style="background:${c}"></span>${esc(p.category)}</span>
            <span class="dist">◎ ${esc(p.districtLabel)}</span>
            <span class="level-tag" style="background:${LEVEL_BADGE_BG[p.level||'center']};color:${LEVEL_BADGE_FG[p.level||'center']}">${LEVEL_LABEL[p.level||'center']}</span>
            <span class="id">${esc(p.id)}</span>
          </div>
          <h2 class="modal-title">${esc(p.name)}</h2>
          <p class="modal-desc">${esc(p.desc)}</p>
          ${renderShareRow(p)}
          ${(!completed && p.delayed) ? `<div style="margin-bottom:16px"><span class="pill-delay">⚠ Behind schedule</span></div>` : ''}

          <div class="panel">
            <div class="panel-row"><span>Construction progress</span><b>${p.progress}%</b></div>
            <div class="feat-prog-bar"><div style="width:${p.progress}%;background:${fc};height:100%;border-radius:999px"></div></div>
          </div>

          <div class="facts">
            <div class="cell"><div class="lbl">Awarded by</div><div class="v">${esc(p.awardedBy)}</div></div>
            <div class="cell"><div class="lbl">${(p.contractors && p.contractors.length > 1) ? 'Contractors' : 'Contractor / executor'}</div><div class="v">${
              (p.contractors && p.contractors.length)
                ? '<ul style="margin:0;padding-left:18px;list-style:disc">' + p.contractors.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'
                : esc(p.contractor)
            }</div></div>
            <div class="cell"><div class="lbl">Owning department</div><div class="v">${esc(p.owner)}</div></div>
            <div class="cell"><div class="lbl">Sanctioned outlay</div><div class="v mono">${INR(p.budget)} <span style="color:#9a9888;font-size:11px">· ${INR(p.spent)} spent</span></div></div>
            <div class="cell"><div class="lbl">Started</div><div class="v mono">${esc(p.start)}</div></div>
            <div class="cell"><div class="lbl">${esc(etaWord)}</div><div class="v mono" style="color:${etaColor}">${esc(completedOrEta)}</div></div>
          </div>

          <h4 class="sect">Who's accountable</h4>
          <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:24px">${leadsHtml}</div>

          <h4 class="sect">Timeline</h4>
          <div class="timeline">${msHtml}</div>

          ${renderAccountabilityPanel(p.id)}

          ${renderPerceptionPanel(p.id)}

          <div id="social-panel-${esc(p.id)}" class="social-panel">${renderSocialPanel(p.id)}</div>

          <h4 class="sect">Citizen comments <span class="comment-count">${cm.length}</span></h4>

          <div class="composer" style="position:relative">
            ${composerOverlay()}
            <div class="composer-btns">
              ${sentBtn('positive','pos','🙂 Positive')}
              ${sentBtn('neutral','neu','😐 Neutral')}
              ${sentBtn('negative','neg','🙁 Concern')}
            </div>
            <textarea id="draft-text" placeholder="Share what you're seeing on the ground…">${esc(state.draftText)}</textarea>
            <div class="composer-foot">
              <small>Verified residents only · be specific &amp; civil</small>
              <button class="post" id="post-btn">Post comment</button>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px">${commentsHtml}</div>

          <div class="sources">
            <div class="sources-lbl">Sourced from</div>
            <div class="sources-row">${sourcesHtml}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  wireModal();
}

function wireModal(){
  const root = document.getElementById('modal-root');
  const backdrop = root.querySelector('.modal-backdrop');
  const modal = root.querySelector('.modal');
  if (!backdrop) return;

  backdrop.addEventListener('click', (e) => {
    // Close only on a direct backdrop click or the explicit X button.
    // The previous closest('[data-close]') check matched the backdrop ancestor
    // from every inner click, closing the modal on any content click.
    if (e.target === backdrop || e.target.closest('button[data-close]')) {
      state.selectedId = null;
      pushProjectUrl(null);
      renderModal();
    }
  });

  root.querySelectorAll('[data-sent]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.draftSentiment = btn.getAttribute('data-sent');
      // light-touch update: re-render only the composer buttons
      root.querySelectorAll('[data-sent]').forEach(b => {
        b.classList.toggle('on', b.getAttribute('data-sent') === state.draftSentiment);
      });
    });
  });

  const ta = root.querySelector('#draft-text');
  if (ta) {
    ta.addEventListener('input', (e) => {
      state.draftText = e.target.value;  // no re-render: keep focus
    });
  }

  const post = root.querySelector('#post-btn');
  if (post) {
    post.addEventListener('click', async () => {
      const id = state.selectedId;
      const t = state.draftText.trim();
      if (!id || !t) return;
      if (NIRMAN_AW && NIRMAN_AW.user) {
        post.disabled = true; post.textContent = 'Posting…';
        try {
          await NIRMAN_AW.postComment({
            projectId: id,
            sentiment: state.draftSentiment,
            text: t,
          });
          await NIRMAN_AW.listComments(id);
          state.draftText = '';
          renderGrid();
          renderModal();
        } catch (err) {
          post.disabled = false; post.textContent = 'Post comment';
          alert(err && err.message ? err.message : 'Could not post — try again.');
        }
        return;
      }
      // In-memory fallback when Appwrite isn't configured.
      const c = { name:'You', loc:'Verified resident', s: state.draftSentiment, text: t, date: 'Just now' };
      state.commentsById[id] = [c, ...(state.commentsById[id] || [])];
      state.draftText = '';
      renderGrid();
      renderModal();
    });
  }

  // Wire the composer's "Sign in to comment" button.
  const composerSignIn = root.querySelector('#composer-signin');
  if (composerSignIn) {
    composerSignIn.addEventListener('click', openSignInCard);
  }

  // Vote buttons.
  root.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!NIRMAN_AW) return;
      if (!NIRMAN_AW.user) { openSignInCard('Sign in to cast your vote.'); return; }
      const pid = btn.getAttribute('data-pid');
      const dir = parseInt(btn.getAttribute('data-vote'), 10);
      btn.disabled = true;
      try {
        await NIRMAN_AW.castVote(pid, dir);
        renderGrid();
        renderModal();
      } catch (err) {
        btn.disabled = false;
        alert((err && err.message) || 'Vote failed.');
      }
    });
  });

  // "Sign in" link inside the perception panel.
  root.querySelectorAll('[data-do-signin]').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); openSignInCard(); });
  });

  // Copy-link share button.
  root.querySelectorAll('[data-share-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-share-copy');
      try {
        await navigator.clipboard.writeText(url);
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="share-ico">✓</span> Copied';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      } catch (_) {
        // Clipboard API not allowed (insecure context) — fallback to prompt
        window.prompt('Copy this link:', url);
      }
    });
  });

  // Accountability "+ Add" buttons.
  root.querySelectorAll('[data-add-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-add-pid');
      const cat = btn.getAttribute('data-add-cat');
      openAccountabilityForm(pid, cat);
    });
  });

  // "Remove vote" link — re-casts the same direction which toggles off.
  root.querySelectorAll('[data-do-unvote]').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const dir = parseInt(a.getAttribute('data-dir'), 10);
      const pid = a.getAttribute('data-pid');
      try {
        await NIRMAN_AW.castVote(pid, dir);
        renderModal();
      } catch (err) {
        alert((err && err.message) || 'Could not remove vote.');
      }
    });
  });

  // "Show all N mentions" — expand the social panel inline.
  root.querySelectorAll('.social-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-pid');
      const data = socialCache[pid];
      if (!data || !data.mentions) return;
      const list = btn.previousElementSibling; // .social-list
      const allHtml = data.mentions.map(m => `
        <a href="${esc(m.url)}" target="_blank" rel="noopener nofollow" class="social-row">
          <div class="social-row-title">${esc(m.title)}</div>
          <div class="social-row-meta">
            <span>${esc(m.source || 'News')}</span>
            ${m.date ? `<span>· ${esc(timeAgo(m.date))}</span>` : ''}
            ${m.lang === 'hi' ? `<span class="social-lang-tag hi">हिं</span>` : (m.lang === 'en' ? `<span class="social-lang-tag en">EN</span>` : '')}
          </div>
        </a>
      `).join('');
      list.innerHTML = allHtml;
      btn.remove();
    });
  });
}

// ---- map module ----

const HP_DISTRICTS = (window.NIRMAN_HP_DISTRICTS && window.NIRMAN_HP_DISTRICTS.features) || [];

const PALETTE_PINE   = ['#f4f3ee', '#d8e2dc', '#a8c6b3', '#5c9379', '#1b5640'];
const PALETTE_OCHRE  = ['#fdf6ec', '#f3deb3', '#e2b974', '#c08e35', '#7a5a1e'];
const PALETTE_BLUE   = ['#f1f3f6', '#d6dee9', '#a3b7cc', '#5e7fa1', '#2b4a6f'];

function metricFor(metric){
  const acc = {}; // district name → {count, budget, flagged, sentSum, sentN}
  for (const f of HP_DISTRICTS) {
    acc[f.properties.name] = { count:0, budget:0, flagged:0, sentSum:0, sentN:0 };
  }
  for (const p of D) {
    if (p.status !== 'active') continue;
    for (const d of (p.dists || [])) {
      const a = acc[d]; if (!a) continue;
      a.count++; a.budget += p.budget; if (p.delayed) a.flagged++;
      a.sentSum += p.sentiment.p; a.sentN++;
    }
  }
  const out = {};
  for (const [name, a] of Object.entries(acc)) {
    let v = 0;
    if (metric === 'count') v = a.count;
    else if (metric === 'budget') v = a.budget;
    else if (metric === 'flagged') v = a.flagged;
    else if (metric === 'sentiment') v = a.sentN ? a.sentSum / a.sentN : 0;
    out[name] = { value: v, count: a.count, budget: a.budget, flagged: a.flagged };
  }
  return out;
}

function paletteFor(metric){
  if (metric === 'flagged') return PALETTE_OCHRE;
  if (metric === 'sentiment') return PALETTE_PINE;
  if (metric === 'budget') return PALETTE_BLUE;
  return PALETTE_PINE;
}

function colorFor(value, max, palette){
  if (max <= 0 || value <= 0) return palette[0];
  const t = Math.min(0.9999, value / max);
  const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
  return palette[idx];
}

function fmtMetric(metric, v){
  if (metric === 'budget') return '₹' + Math.round(v).toLocaleString('en-IN') + ' Cr';
  if (metric === 'sentiment') return Math.round(v) + '% positive';
  return Math.round(v) + (metric === 'flagged' ? ' flagged' : ' projects');
}

function bboxOfFeatures(){
  let minLng=Infinity, maxLng=-Infinity, minLat=Infinity, maxLat=-Infinity;
  for (const f of HP_DISTRICTS) {
    for (const ring of f.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return { minLng, maxLng, minLat, maxLat };
}

function projector(box, W, H, pad){
  const w = box.maxLng - box.minLng, h = box.maxLat - box.minLat;
  // equirectangular with latitude-aware aspect (HP is at ~31° N, cos(31°) ≈ 0.857)
  const cos = Math.cos((box.minLat + box.maxLat) / 2 * Math.PI / 180);
  const aspect = (w * cos) / h;
  const innerW = W - 2 * pad, innerH = H - 2 * pad;
  let drawW, drawH;
  if (aspect > innerW / innerH) { drawW = innerW; drawH = innerW / aspect; }
  else { drawH = innerH; drawW = innerH * aspect; }
  const ox = pad + (innerW - drawW) / 2;
  const oy = pad + (innerH - drawH) / 2;
  return (lng, lat) => {
    const x = ox + (lng - box.minLng) / w * drawW;
    const y = oy + (box.maxLat - lat) / h * drawH;
    return [x, y];
  };
}

function ringPath(ring, proj){
  let s = '';
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = proj(ring[i][0], ring[i][1]);
    s += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }
  return s + 'Z';
}

function ringCentroid(ring){
  let cx = 0, cy = 0, n = ring.length - 1; // last == first
  for (let i = 0; i < n; i++) { cx += ring[i][0]; cy += ring[i][1]; }
  return [cx / n, cy / n];
}

// Unified renderer — always draws the HP choropleth; pin overlay in 'projects' mode.
// No external tiles (avoids the J&K / Aksai Chin boundary issue OSM ships with),
// no Leaflet dependency. Pure SVG, fully self-contained.

const MAP_W = 980, MAP_H = 420;

function renderMap(){
  const canvas = document.getElementById('map-canvas');
  const tip = document.getElementById('map-tooltip');
  canvas.innerHTML = '';
  if (tip) canvas.appendChild(tip);

  if (!HP_DISTRICTS.length) {
    canvas.insertAdjacentHTML('beforeend',
      '<div style="padding:24px;color:#8a8a7e;font-size:13px">District polygons failed to load. Try reloading.</div>');
    return;
  }

  const box = bboxOfFeatures();
  const proj = projector(box, MAP_W, MAP_H, 14);
  const metrics = metricFor(state.mapMetric);
  const palette = paletteFor(state.mapMetric);
  const max = Math.max(0.0001, ...Object.values(metrics).map(m => m.value));

  let svg = `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`;

  // District polygons — always rendered.
  for (const f of HP_DISTRICTS) {
    const name = f.properties.name;
    const m = metrics[name] || { value: 0, count: 0, budget: 0, flagged: 0 };
    const fill = colorFor(m.value, max, palette);
    const isOn = state.district === name;
    const paths = f.geometry.coordinates.map(r => ringPath(r, proj)).join(' ');
    svg += `<path class="district-path${isOn?' on':''}" data-name="${name}" d="${paths}" fill="${fill}" />`;
  }

  // District labels at centroid of biggest ring.
  for (const f of HP_DISTRICTS) {
    const ring = f.geometry.coordinates.reduce((a,b) => a.length >= b.length ? a : b);
    const [clng, clat] = ringCentroid(ring);
    const [cx, cy] = proj(clng, clat);
    const m = metrics[f.properties.name] || { value: 0 };
    const dark = (m.value / max) > 0.55;
    svg += `<text class="district-label${dark?' dark':''}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}">${f.properties.name}</text>`;
  }

  // Pin overlay — only in 'projects' mode.
  if (state.mapMode === 'projects') {
    // Project pin layer rendered after labels so pins sit on top.
    svg += '<g class="pin-layer">';
    for (const p of D) {
      if (!p.coords) continue;
      const [lat, lng] = p.coords;
      const [x, y] = proj(lng, lat);
      const cls = p.status === 'completed' ? 'completed' : (p.delayed ? 'delayed' : 'active');
      svg += `<g class="nd-pin-svg" data-pin="${esc(p.id)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
        <circle class="halo" r="9" />
        <circle class="core ${cls}" r="5.5" />
      </g>`;
    }
    svg += '</g>';
  }

  svg += '</svg>';
  canvas.insertAdjacentHTML('beforeend', svg);

  wireMapEvents(metrics, max);
  renderMapLegend(palette, max);
  renderFilterPill();

  // sync mode buttons
  document.querySelectorAll('.map-mode button').forEach(b => {
    b.classList.toggle('on', b.getAttribute('data-mode') === state.mapMode);
  });
  // metric select is meaningless when the focus is pins
  const metricSel = document.getElementById('map-metric');
  if (metricSel) metricSel.style.display = state.mapMode === 'projects' ? 'none' : '';
}

function renderMapLegend(palette, max){
  const el = document.getElementById('map-legend');
  if (!el) return;
  if (state.mapMode === 'projects') {
    el.innerHTML = `
      <span><b>Legend</b></span>
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:50%;background:#1b5640;border:2px solid #fff;box-shadow:0 0 0 1px #d8e2dc"></span>Active · on track</span>
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:50%;background:#b3721f;border:2px solid #fff;box-shadow:0 0 0 1px #f3deb3"></span>Active · delayed</span>
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:50%;background:#3f6b6e;border:2px solid #fff;box-shadow:0 0 0 1px #d8e2dc"></span>Completed</span>
      <span style="margin-left:auto;font-size:11px;color:#a4a294">Pin positions are approximate site coordinates · refined in Phase 2.</span>
    `;
  } else {
    const swatches = palette.map(c => `<span class="sw" style="background:${c}"></span>`).join('');
    const lowLabel = '0';
    const highLabel = fmtMetric(state.mapMetric, max).replace(/^.*?[\d]/, m => m);
    el.innerHTML = `
      <span><b>Legend</b> · per district</span>
      <div class="swatch-row">${swatches}</div>
      <span style="font-family:'IBM Plex Mono',monospace;color:#8a8a7e">${lowLabel} → ${highLabel}</span>
      <span style="margin-left:auto;font-size:11px;color:#a4a294">Boundaries: geohacker/india (Census 2011, simplified). HP-only — no inter-state lines drawn.</span>
    `;
  }
}

function renderFilterPill(){
  const el = document.getElementById('map-filter-pill');
  if (!el) return;
  if (state.district === 'All') { el.innerHTML = ''; return; }
  const list = visibleList();
  el.innerHTML = `
    <span class="filt-chip">
      Filtered to <b>${esc(state.district)}</b>
      <button type="button" data-clear="1" aria-label="Clear district filter">✕</button>
    </span>
    <span style="color:#5c686f">Showing ${list.length} project${list.length === 1 ? '' : 's'} below.</span>
    <a data-scroll-grid="1" style="margin-left:auto">Jump to list ↓</a>
  `;
  el.querySelector('[data-clear]')?.addEventListener('click', () => {
    state.district = 'All';
    const sel = document.getElementById('district'); if (sel) sel.value = 'All';
    renderMap(); renderGrid();
  });
  el.querySelector('[data-scroll-grid]')?.addEventListener('click', () => {
    document.getElementById('grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function wireMapEvents(metrics, max){
  const canvas = document.getElementById('map-canvas');
  const tip = document.getElementById('map-tooltip');

  canvas.querySelectorAll('.district-path').forEach(path => {
    const name = path.getAttribute('data-name');
    path.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      const m = metrics[name];
      tip.innerHTML = `<b>${name}</b>${m.count} active · ₹${m.budget.toLocaleString('en-IN')} Cr · ${m.flagged} flagged`;
      tip.style.left = (e.clientX - r.left) + 'px';
      tip.style.top = (e.clientY - r.top) + 'px';
      tip.classList.add('show');
    });
    path.addEventListener('mouseleave', () => tip.classList.remove('show'));
    path.addEventListener('click', () => {
      state.district = (state.district === name) ? 'All' : name;
      const sel = document.getElementById('district'); if (sel) sel.value = state.district;
      renderMap(); renderGrid();
      // make the side-effect visible — smooth-scroll to the filter pill below the map
      requestAnimationFrame(() => {
        document.getElementById('map-filter-pill').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  });

  canvas.querySelectorAll('[data-pin]').forEach(g => {
    const id = g.getAttribute('data-pin');
    const p = D.find(x => x.id === id); if (!p) return;
    g.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      const statusText = p.status === 'completed' ? 'Completed' : (p.delayed ? 'Active · delayed' : 'Active · on track');
      tip.innerHTML = `<b>${esc(p.name)}</b>${esc(p.districtLabel)} · ${p.progress}% · ${statusText}`;
      tip.style.left = (e.clientX - r.left) + 'px';
      tip.style.top = (e.clientY - r.top) + 'px';
      tip.classList.add('show');
    });
    g.addEventListener('mouseleave', () => tip.classList.remove('show'));
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedId = id;
      pushProjectUrl(id);
      renderModal();
    });
  });
}

// ---- top-level wiring (once) ----
function wireOnce(){
  document.getElementById('tab-active').addEventListener('click', () => {
    state.tab = 'active'; renderTabs(); renderFeatured(); renderGrid();
  });
  document.getElementById('tab-completed').addEventListener('click', () => {
    state.tab = 'completed'; renderTabs(); renderFeatured(); renderGrid();
  });
  document.getElementById('search').addEventListener('input', (e) => {
    state.q = e.target.value; renderGrid();
  });
  document.getElementById('district').addEventListener('change', (e) => {
    state.district = e.target.value;
    renderMap();
    renderGrid();
  });
  document.querySelectorAll('.map-mode button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mapMode = btn.getAttribute('data-mode');
      renderMap();
    });
  });
  document.getElementById('map-metric').addEventListener('change', (e) => {
    state.mapMetric = e.target.value; renderMap();
  });
  document.getElementById('level').addEventListener('change', (e) => {
    state.level = e.target.value; renderGrid();
  });
  document.getElementById('sort').addEventListener('change', (e) => {
    state.sort = e.target.value; renderGrid();
  });

  // chip + card delegation
  document.getElementById('chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.category = btn.getAttribute('data-cat');
    renderChips(); renderGrid();
  });
  const openFromClick = (e) => {
    const el = e.target.closest('[data-open]');
    if (!el) return;
    state.selectedId = el.getAttribute('data-open');
    pushProjectUrl(state.selectedId);
    renderModal();
  };
  document.getElementById('grid').addEventListener('click', openFromClick);
  document.getElementById('featured-wrap').addEventListener('click', openFromClick);

  // ESC closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedId) {
      state.selectedId = null;
      pushProjectUrl(null);
      renderModal();
    }
  });

  // Browser back/forward — sync the modal to the URL.
  window.addEventListener('popstate', () => {
    const u = new URL(window.location.href);
    const pid = u.searchParams.get('project');
    state.selectedId = pid && D.find(p => p.id === pid) ? pid : null;
    renderModal();
  });
}

// Open the right project on first paint if the URL contains ?project=ID.
function openFromDeepLink(){
  const u = new URL(window.location.href);
  const pid = u.searchParams.get('project');
  if (pid && D.find(p => p.id === pid)) {
    state.selectedId = pid;
    renderModal();
  }
}

// ---- initial render ----
renderStats();
renderDistrictOptions();
renderChips();
renderTabs();
renderMap();
renderFeatured();
renderGrid();
wireOnce();
openFromDeepLink();
bootstrapAppwrite();
