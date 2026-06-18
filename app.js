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

function commentsFor(id){ return state.commentsById[id] || []; }

// ---- header sync ----
document.getElementById('sync-time').textContent = 'Auto-synced ' + formatIST(new Date());
resolveSyncTime().then(t => {
  document.getElementById('sync-time').textContent = 'Auto-synced ' + t;
}).catch(() => {});

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
      (p.name + ' ' + p.contractor + ' ' + p.districtLabel + ' ' + p.category).toLowerCase().includes(q)
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
            <div class="card-contractor">${esc(p.contractor)}</div>
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
function srcIcon(t){ return t === 'gov' ? '🏛' : t === 'press' ? '📰' : '✔'; }
function sentLabel(s){ return s === 'positive' ? 'Positive' : s === 'negative' ? 'Concern' : 'Neutral'; }
function sentTagClass(s){ return s === 'positive' ? 'pos' : s === 'negative' ? 'neg' : 'neu'; }

function renderModal(){
  const root = document.getElementById('modal-root');
  if (!state.selectedId) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
  const p = D.find(x => x.id === state.selectedId);
  if (!p) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
  document.body.style.overflow = 'hidden';

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
          ${(!completed && p.delayed) ? `<div style="margin-bottom:16px"><span class="pill-delay">⚠ Behind schedule</span></div>` : ''}

          <div class="panel">
            <div class="panel-row"><span>Construction progress</span><b>${p.progress}%</b></div>
            <div class="feat-prog-bar"><div style="width:${p.progress}%;background:${fc};height:100%;border-radius:999px"></div></div>
          </div>

          <div class="facts">
            <div class="cell"><div class="lbl">Awarded by</div><div class="v">${esc(p.awardedBy)}</div></div>
            <div class="cell"><div class="lbl">Contractor / executor</div><div class="v">${esc(p.contractor)}</div></div>
            <div class="cell"><div class="lbl">Owning department</div><div class="v">${esc(p.owner)}</div></div>
            <div class="cell"><div class="lbl">Sanctioned outlay</div><div class="v mono">${INR(p.budget)} <span style="color:#9a9888;font-size:11px">· ${INR(p.spent)} spent</span></div></div>
            <div class="cell"><div class="lbl">Started</div><div class="v mono">${esc(p.start)}</div></div>
            <div class="cell"><div class="lbl">${esc(etaWord)}</div><div class="v mono" style="color:${etaColor}">${esc(completedOrEta)}</div></div>
          </div>

          <h4 class="sect">Who's accountable</h4>
          <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:24px">${leadsHtml}</div>

          <h4 class="sect">Timeline</h4>
          <div class="timeline">${msHtml}</div>

          ${(ratings >= 25) ? `
            <div class="perception">
              <div class="perception-top">
                <div>
                  <h4 class="sect" style="margin:0">Public perception</h4>
                  <div class="perception-sub">From ${ratingsFmt} verified voices across sources</div>
                </div>
                ${p.score ? `<div class="perception-score">${p.score.toFixed(1)}<small>/ 5.0</small></div>` : ''}
              </div>
              <div class="perception-bar">
                <div style="width:${p.sentiment.p}%;background:#3f9e6a"></div>
                <div style="width:${p.sentiment.n}%;background:#dcb24f"></div>
                <div style="width:${p.sentiment.x}%;background:#c2664f"></div>
              </div>
              <div class="perception-legend">
                <span class="pos">● Positive ${p.sentiment.p}%</span>
                <span class="neu">● Neutral ${p.sentiment.n}%</span>
                <span class="neg">● Concern ${p.sentiment.x}%</span>
              </div>
            </div>
          ` : `
            <div class="perception" style="background:#fbf8ef">
              <h4 class="sect" style="margin:0 0 4px">Public perception</h4>
              <p style="font-size:13px;color:#7d8a82;line-height:1.5;margin:0">
                Sentiment is hidden until at least <b>25 verified voices</b> have weighed in.
                Showing percentages from a smaller sample is statistical theatre. Voices are coming in Phase 2
                via verified resident sign-in.
              </p>
            </div>
          `}

          <h4 class="sect">Citizen comments <span class="comment-count">${cm.length}</span></h4>

          <div class="composer" style="position:relative">
            <div style="position:absolute;inset:0;background:rgba(255,255,255,.55);backdrop-filter:blur(1px);border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;font-size:12px;color:#5c686f;line-height:1.5;z-index:1">
              Comments will go live once verified resident sign-in is wired in <b>Phase 2</b>.<br>This composer is a preview only.
            </div>
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
    if (e.target.closest('[data-close]')) {
      state.selectedId = null;
      renderModal();
    }
  });
  modal.addEventListener('click', (e) => {
    // Stop bubbling for inner clicks except explicit close
    if (!e.target.closest('[data-close]')) e.stopPropagation();
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
    post.addEventListener('click', () => {
      const id = state.selectedId;
      const t = state.draftText.trim();
      if (!id || !t) return;
      const c = { name:'You', loc:'Verified resident', s: state.draftSentiment, text: t, date: 'Just now' };
      state.commentsById[id] = [c, ...(state.commentsById[id] || [])];
      state.draftText = '';
      renderGrid();   // update voice counts on cards
      renderModal(); // re-render comments list
    });
  }
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
    if (state.mapMode === 'choropleth') renderMap();
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
    renderModal();
  };
  document.getElementById('grid').addEventListener('click', openFromClick);
  document.getElementById('featured-wrap').addEventListener('click', openFromClick);

  // ESC closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedId) {
      state.selectedId = null;
      renderModal();
    }
  });
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
