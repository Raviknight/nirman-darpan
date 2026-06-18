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

const D = [
  {
    id:'NH5-PWN-SHL', name:'Chandigarh–Shimla 4-Lane Highway (NH-5)', category:'Roads & highways',
    dists:['Solan','Shimla'], districtLabel:'Solan · Shimla', status:'active', progress:68, delayed:true,
    start:'Mar 2018', eta:'Dec 2026', budget:3475, spent:2360,
    awardedBy:'NHAI — National Highways Authority of India', contractor:'Gawar–Sushee JV (EPC)',
    owner:'Ministry of Road Transport & Highways', img:'corridor / viaduct photo', score:3.6, ratings:4120,
    leads:[{n:'R. K. Pankaj',r:'Project Director, NHAI Shimla PIU'},{n:'Anil Sharma',r:'Resident Engineer'},{n:'Gawar Construction',r:'EPC contractor lead'}],
    desc:'Widening of the 92 km Parwanoo–Solan–Shimla corridor to four lanes with bypasses, viaducts and tunnels to cut travel time and reduce landslide closures.',
    sentiment:{p:58,n:27,x:15},
    milestones:[
      {l:'Parwanoo–Solan stretch opened to traffic',d:'2021',done:true},
      {l:'Solan–Kaithlighat four-laning completed',d:'2024',done:true},
      {l:'Kaithlighat–Dhalli tunnels & viaducts',d:'In progress · 2026',done:false},
      {l:'Full corridor commissioning',d:'Target Dec 2026',done:false},
    ],
    sources:[{t:'gov',n:'NHAI project portal'},{t:'press',n:'The Tribune, Shimla'},{t:'social',n:'@HP_PWD (verified)'}],
    comments:[
      {name:'Vikram Thakur',loc:'Solan',s:'positive',text:'The Parwanoo–Solan stretch is genuinely a relief — monsoon drive used to take double the time.',date:'3 days ago'},
      {name:'Neha Verma',loc:'Shimla',s:'negative',text:'Kaithlighat–Dhalli has been "almost done" for two years. The slow viaduct work near Shoghi is a daily jam.',date:'1 week ago'},
      {name:'Aman Gupta',loc:'Kandaghat',s:'neutral',text:'Quality of the new stretches looks solid, but ETAs keep slipping. Hope Dec 2026 holds.',date:'2 weeks ago'},
    ],
  },
  {
    id:'RENUKA-DAM', name:'Renukaji Multipurpose Dam', category:'Power & hydro',
    dists:['Sirmaur'], districtLabel:'Sirmaur', status:'active', progress:34, delayed:true,
    start:'Dec 2019', eta:'2029', budget:7000, spent:1980,
    awardedBy:'HP Power Corporation / Six-state consortium', contractor:'HPPCL execution wing',
    owner:'HP Power Corporation Ltd (HPPCL)', img:'dam site / Giri river', score:2.9, ratings:2640,
    leads:[{n:'Sanjay Gupta',r:'Director (Projects), HPPCL'},{n:'Meena Rao',r:'Chief Engineer, civil'},{n:'R&R Cell',r:'Resettlement & rehab office'}],
    desc:'A 148 m dam on the Giri river primarily to augment drinking water supply to Delhi, with a 40 MW power component. Tied up in land acquisition and rehabilitation.',
    sentiment:{p:31,n:34,x:35},
    milestones:[
      {l:'Forest & environment clearances',d:'2019',done:true},
      {l:'Land acquisition & R&R packages',d:'Ongoing',done:false},
      {l:'Main dam construction',d:'Not started',done:false},
      {l:'Commissioning',d:'Target 2029',done:false},
    ],
    sources:[{t:'gov',n:'HPPCL tender records'},{t:'press',n:'Amar Ujala'},{t:'social',n:'@SirmaurVoices (verified)'}],
    comments:[
      {name:'Dinesh Negi',loc:'Dadahu',s:'negative',text:'Rehabilitation packages for affected villages are still unclear. People deserve certainty before construction.',date:'5 days ago'},
      {name:'Pooja Sharma',loc:'Nahan',s:'neutral',text:'Water security is important, but Himachal carries the cost while Delhi gets the supply. Needs fair terms.',date:'2 weeks ago'},
    ],
  },
  {
    id:'LUHRI-1', name:'Luhri Stage-I Hydroelectric Project', category:'Power & hydro',
    dists:['Shimla','Kullu'], districtLabel:'Shimla · Kullu', status:'active', progress:52, delayed:false,
    start:'Nov 2020', eta:'2027', budget:1810, spent:980,
    awardedBy:'SJVN Ltd', contractor:'Patel Engineering', owner:'SJVN Ltd (PSU)', img:'powerhouse / Sutlej', score:3.8, ratings:1490,
    leads:[{n:'A. K. Singh',r:'Head of Project, SJVN'},{n:'Rohit Katoch',r:'Site Civil Engineer'}],
    desc:'A 210 MW run-of-river project on the Sutlej spanning the Shimla–Kullu border, designed to feed clean power to the northern grid.',
    sentiment:{p:64,n:24,x:12},
    milestones:[
      {l:'Foundation stone laid',d:'2020',done:true},
      {l:'Coffer dam & diversion tunnel',d:'2023',done:true},
      {l:'Powerhouse & barrage works',d:'In progress',done:false},
      {l:'First unit synchronisation',d:'Target 2027',done:false},
    ],
    sources:[{t:'gov',n:'SJVN disclosures'},{t:'press',n:'Divya Himachal'},{t:'social',n:'@SJVN_Official (verified)'}],
    comments:[
      {name:'Tara Chand',loc:'Rampur',s:'positive',text:'Local employment during construction has been decent. Roads to the site improved too.',date:'4 days ago'},
      {name:'Suresh Mehta',loc:'Nirmand',s:'neutral',text:'On schedule so far. Watching how they handle silt and downstream flow.',date:'1 week ago'},
    ],
  },
  {
    id:'SML-WATER', name:'Shimla Water Supply Augmentation (Sutlej Lift)', category:'Water & sanitation',
    dists:['Shimla'], districtLabel:'Shimla', status:'active', progress:81, delayed:false,
    start:'Jun 2019', eta:'Sep 2026', budget:709, spent:602,
    awardedBy:'World Bank / Shimla Jal Prabandhan Nigam', contractor:'Larsen & Toubro', owner:'SJPNL', img:'pumping station / pipeline', score:4.1, ratings:3870,
    leads:[{n:'Dharmendra Gill',r:'CEO, SJPNL'},{n:'Kavita Joshi',r:'Project Engineer'},{n:'L&T Water',r:'Execution partner'}],
    desc:'A World Bank–backed scheme lifting 67 MLD from the Sutlej at Sunni to end Shimla’s chronic summer water crisis after the 2018 shortage.',
    sentiment:{p:73,n:19,x:8},
    milestones:[
      {l:'Sunni intake & rising main',d:'2022',done:true},
      {l:'Pumping stations commissioned',d:'2024',done:true},
      {l:'City distribution upgrades',d:'In progress',done:false},
      {l:'Full 67 MLD supply',d:'Target Sep 2026',done:false},
    ],
    sources:[{t:'gov',n:'SJPNL portal'},{t:'press',n:'The Indian Express'},{t:'social',n:'@ShimlaJal (verified)'}],
    comments:[
      {name:'Ritika Bansal',loc:'Sanjauli',s:'positive',text:'Last two summers were the first without tanker queues in my locality. Huge difference.',date:'6 days ago'},
      {name:'Mohit Rana',loc:'Chhota Shimla',s:'positive',text:'Pressure has improved. Still some old-pipe leakages to fix in the inner city.',date:'2 weeks ago'},
    ],
  },
  {
    id:'KGR-AIRPORT', name:'Kangra (Gaggal) Airport Expansion', category:'Tourism infrastructure',
    dists:['Kangra'], districtLabel:'Kangra', status:'active', progress:22, delayed:true,
    start:'Feb 2022', eta:'2028', budget:3300, spent:410,
    awardedBy:'AAI / HP Govt (land acquisition)', contractor:'To be awarded (post-acquisition)', owner:'Airports Authority of India', img:'runway / terminal render', score:2.6, ratings:1980,
    leads:[{n:'Deputy Commissioner, Kangra',r:'Land acquisition nodal officer'},{n:'AAI Regional Office',r:'Technical planning'}],
    desc:'Runway extension from 1,376 m to 3,010 m to allow larger aircraft for the Dharamshala tourism circuit. Stalled by acquisition of land across several villages.',
    sentiment:{p:36,n:28,x:36},
    milestones:[
      {l:'Master plan & DPR approved',d:'2022',done:true},
      {l:'Land acquisition (villages)',d:'Disputed · ongoing',done:false},
      {l:'Runway & terminal construction',d:'Not started',done:false},
      {l:'Operational larger aircraft',d:'Target 2028',done:false},
    ],
    sources:[{t:'gov',n:'AAI / DC Kangra notices'},{t:'press',n:'Hindustan Times'},{t:'social',n:'@KangraUpdates (verified)'}],
    comments:[
      {name:'Harish Sood',loc:'Gaggal',s:'negative',text:'Compensation rates being offered are below market. Families have lived here for generations.',date:'2 days ago'},
      {name:'Anjali Dogra',loc:'Dharamshala',s:'positive',text:'Tourism badly needs bigger flights. Hope a fair settlement unlocks this soon.',date:'1 week ago'},
    ],
  },
  {
    id:'MANDI-FLOOD', name:'Mandi–Kullu 2023 Flood Road Restoration', category:'Disaster recovery',
    dists:['Mandi','Kullu'], districtLabel:'Mandi · Kullu', status:'active', progress:74, delayed:false,
    start:'Aug 2023', eta:'Dec 2026', budget:1240, spent:910,
    awardedBy:'HP PWD / NDRF support', contractor:'Multiple district PWD divisions', owner:'HP Public Works Department', img:'restored road / river edge', score:3.9, ratings:5210,
    leads:[{n:'Engineer-in-Chief, HP PWD',r:'Restoration programme head'},{n:'SE Mandi Circle',r:'Field execution'},{n:'SE Kullu Circle',r:'Field execution'}],
    desc:'Rebuilding of national & state highways, bridges and link roads washed out in the July 2023 floods across the Beas valley — restoring connectivity to cut-off villages.',
    sentiment:{p:67,n:23,x:10},
    milestones:[
      {l:'Emergency single-lane restoration',d:'2023',done:true},
      {l:'Permanent road & retaining works',d:'In progress',done:false},
      {l:'Bridge reconstruction (key spans)',d:'In progress',done:false},
      {l:'Full programme closure',d:'Target Dec 2026',done:false},
    ],
    sources:[{t:'gov',n:'HP PWD damage reports'},{t:'press',n:'The Tribune'},{t:'social',n:'@HPSDMA (verified)'}],
    comments:[
      {name:'Lekh Raj',loc:'Aut',s:'positive',text:'Our village was cut off for weeks. The temporary bridge came up fast — credit where due.',date:'5 days ago'},
      {name:'Sunita Devi',loc:'Bajaura',s:'neutral',text:'Main roads are back but several link roads to upper villages are still rough. Please don’t forget them.',date:'2 weeks ago'},
    ],
  },
  {
    id:'ATAL-TUNNEL', name:'Atal Tunnel, Rohtang', category:'Bridges & tunnels',
    dists:['Lahaul-Spiti'], districtLabel:'Lahaul-Spiti', status:'completed', progress:100, delayed:false,
    start:'2010', eta:'2020', completed:'Oct 2020', budget:3300, spent:3300,
    awardedBy:'BRO — Ministry of Defence', contractor:'Strabag–Afcons JV', owner:'Border Roads Organisation', img:'tunnel portal / Lahaul valley', score:4.8, ratings:9800,
    leads:[{n:'Brig. K.P. Purushothaman',r:'BRO Project Chief Engineer'},{n:'Strabag–Afcons',r:'Tunnelling contractor'}],
    desc:'A 9.02 km highway tunnel under the Rohtang Pass giving year-round access to the Lahaul valley — among the world’s longest road tunnels above 10,000 ft.',
    sentiment:{p:88,n:9,x:3},
    milestones:[
      {l:'Construction began',d:'2010',done:true},
      {l:'Breakthrough achieved',d:'2017',done:true},
      {l:'Inaugurated & opened',d:'Oct 2020',done:true},
      {l:'All-weather Lahaul access',d:'Delivered',done:true},
    ],
    sources:[{t:'gov',n:'BRO records'},{t:'press',n:'The Hindu'},{t:'social',n:'@official_dgbr (verified)'}],
    comments:[
      {name:'Tashi Dorje',loc:'Keylong',s:'positive',text:'Life-changing. Lahaul is no longer cut off for six months. Medical emergencies finally have a route.',date:'1 month ago'},
      {name:'Rinchen Angmo',loc:'Sissu',s:'positive',text:'Tourism and our local economy completely transformed after this opened.',date:'2 months ago'},
    ],
  },
  {
    id:'AIIMS-BLP', name:'AIIMS Bilaspur', category:'Hospitals & health',
    dists:['Bilaspur'], districtLabel:'Bilaspur', status:'completed', progress:100, delayed:false,
    start:'2017', eta:'2022', completed:'Oct 2022', budget:1470, spent:1470,
    awardedBy:'Ministry of Health & Family Welfare', contractor:'HSCC (India) Ltd', owner:'AIIMS / MoHFW', img:'hospital campus, Kothipura', score:4.4, ratings:6300,
    leads:[{n:'Executive Director, AIIMS Bilaspur',r:'Institutional head'},{n:'HSCC (India)',r:'Construction agency'}],
    desc:'A 750-bed tertiary-care institute at Kothipura under PMSSY, bringing super-specialty care and a medical college to the lower Himalayan belt.',
    sentiment:{p:80,n:14,x:6},
    milestones:[
      {l:'Foundation laid',d:'2017',done:true},
      {l:'OPD services began',d:'2021',done:true},
      {l:'Full inauguration',d:'Oct 2022',done:true},
      {l:'Medical college intake',d:'Operational',done:true},
    ],
    sources:[{t:'gov',n:'PMSSY / MoHFW'},{t:'press',n:'Hindustan Times'},{t:'social',n:'@AIIMSBilaspur (verified)'}],
    comments:[
      {name:'Kamlesh Kumar',loc:'Bilaspur',s:'positive',text:'We no longer have to travel to Chandigarh or PGI for serious treatment. Massive relief for the region.',date:'3 weeks ago'},
      {name:'Reena Thakur',loc:'Ghumarwin',s:'neutral',text:'Great facility, but specialist appointment waiting times are long. More staff needed.',date:'1 month ago'},
    ],
  },
  {
    id:'SCHOOL-MOD', name:'Govt. School STEM Modernisation Cluster', category:'Schools & education',
    dists:['Hamirpur','Una'], districtLabel:'Hamirpur · Una', status:'completed', progress:100, delayed:false,
    start:'2021', eta:'2024', completed:'Mar 2024', budget:185, spent:178,
    awardedBy:'HP Education Dept / Samagra Shiksha', contractor:'District works divisions', owner:'Dept. of Elementary & Higher Education', img:'classroom / smart lab', score:4.0, ratings:2210,
    leads:[{n:'Director, Higher Education',r:'Programme owner'},{n:'District Project Officers',r:'Rollout & monitoring'}],
    desc:'Smart classrooms, science & computer labs and accessibility upgrades across 120 government schools in Hamirpur and Una districts.',
    sentiment:{p:71,n:22,x:7},
    milestones:[
      {l:'School survey & prioritisation',d:'2021',done:true},
      {l:'Civil upgrades & labs',d:'2023',done:true},
      {l:'Equipment & connectivity',d:'2024',done:true},
      {l:'Teacher training rollout',d:'Delivered',done:true},
    ],
    sources:[{t:'gov',n:'Samagra Shiksha HP'},{t:'press',n:'Divya Himachal'},{t:'social',n:'@EduDeptHP (verified)'}],
    comments:[
      {name:'Anita Kaushal',loc:'Hamirpur',s:'positive',text:'My daughter’s school finally has a working computer lab. The change in interest level is visible.',date:'1 month ago'},
      {name:'Prem Singh',loc:'Una',s:'neutral',text:'Good infrastructure, but a few schools still wait on reliable internet for the smart boards.',date:'6 weeks ago'},
    ],
  },
];

const FEATURED_ID = 'NH5-PWN-SHL';
const SYNC_TIME = '18 Jun 2026, 09:40 IST';

// ---- state ----
const state = {
  tab: 'active',
  category: 'All',
  district: 'All',
  q: '',
  sort: 'attention',
  selectedId: null,
  draftSentiment: 'positive',
  draftText: '',
  commentsById: Object.fromEntries(D.map(p => [p.id, p.comments.slice()])),
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
document.getElementById('sync-time').textContent = 'Auto-synced ' + SYNC_TIME;

// ---- stats ----
function renderStats(){
  const active = D.filter(p => p.status === 'active');
  const completed = D.filter(p => p.status === 'completed');
  const totalBudget = D.reduce((a,p) => a + p.budget, 0);
  const avgPos = active.length
    ? Math.round(active.reduce((a,p) => a + p.sentiment.p, 0) / active.length)
    : 0;
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
      <div class="stat-sub">across all activities</div>
    </div>
    <div class="stat">
      <div class="stat-label">Public sentiment</div>
      <div class="stat-value" style="color:#2f7d52">${avgPos}%</div>
      <div class="stat-sub">avg. positive</div>
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
    return `
      <article class="card" data-open="${esc(p.id)}">
        <div class="card-img">
          <span class="card-cat"><span class="dot" style="background:${c}"></span>${esc(p.category)}</span>
          <span class="status-pill ${completed?'completed':'active'}">${completed?'Completed':'In progress'}</span>
        </div>
        <div class="card-body">
          <div class="card-row">
            <span class="card-meta">◎ ${esc(p.districtLabel)}</span>
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
            <div class="sent-row">
              <span class="sent-label">Public sentiment</span>
              <span class="sent-num"><strong>${p.sentiment.p}%</strong> <span>· ${ratingsFmt} voices</span></span>
            </div>
            <div class="sent-bar">
              <div style="width:${p.sentiment.p}%;background:#3f9e6a"></div>
              <div style="width:${p.sentiment.n}%;background:#dcb24f"></div>
              <div style="width:${p.sentiment.x}%;background:#c2664f"></div>
            </div>
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

          <div class="perception">
            <div class="perception-top">
              <div>
                <h4 class="sect" style="margin:0">Public perception</h4>
                <div class="perception-sub">From ${ratingsFmt} verified voices across sources</div>
              </div>
              <div class="perception-score">${p.score.toFixed(1)}<small>/ 5.0</small></div>
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

          <h4 class="sect">Citizen comments <span class="comment-count">${cm.length}</span></h4>

          <div class="composer">
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
    state.district = e.target.value; renderGrid();
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
renderFeatured();
renderGrid();
wireOnce();
