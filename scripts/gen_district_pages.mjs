// scripts/gen_district_pages.mjs
// Generate one landing page per HP district at /districts/<name>/index.html.
// Each page lists the projects in that district with quick stats and is its
// own indexable URL. Catches search traffic like "Mandi projects" or "Kangra
// infrastructure" that the main tracker doesn't otherwise serve.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SITE = 'https://raviknight.github.io/nirman-darpan/';

const DISTRICTS = [
  { name: 'Bilaspur',     hq: 'Bilaspur',        blurb: 'Lower Himalayan belt; key projects include the Bhakra reservoir cantilever viaduct and AIIMS Bilaspur.' },
  { name: 'Chamba',       hq: 'Chamba',          blurb: 'Far north-western HP; Ravi valley district with hydropower projects on the Ravi system.' },
  { name: 'Hamirpur',     hq: 'Hamirpur',        blurb: 'Compact, populous mid-altitude district; education and link-road investment-heavy.' },
  { name: 'Kangra',       hq: 'Dharamshala',     blurb: 'Largest population in HP; tourism, religious, and the long-delayed Kangra airport expansion.' },
  { name: 'Kinnaur',      hq: 'Reckong Peo',     blurb: 'Far eastern HP, on the Tibet border; Sutlej basin hydropower belt.' },
  { name: 'Kullu',        hq: 'Kullu',           blurb: 'Central HP; Beas valley; tourism and hydropower.' },
  { name: 'Lahaul-Spiti', hq: 'Keylong',         blurb: 'Highest, sparsest district; Atal Tunnel transformed access, Shinku La is next.' },
  { name: 'Mandi',        hq: 'Mandi',           blurb: 'Geographic centre of HP; IIT Mandi, Balh valley airport plan, NH-21 corridor.' },
  { name: 'Shimla',       hq: 'Shimla',          blurb: 'State capital; Shimla Smart City Mission, water augmentation, NH-5 widening.' },
  { name: 'Sirmaur',      hq: 'Nahan',           blurb: 'Southern HP; Renukaji dam, government medical college, Giri river basin.' },
  { name: 'Solan',        hq: 'Solan',           blurb: 'Industrial belt; NH-5 corridor, NH-105 to Baddi-Nalagarh, bus stand redev.' },
  { name: 'Una',          hq: 'Una',             blurb: 'Lowest-altitude district; Punjab border; Pekhubela solar project.' },
];

const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const arrayLiteralMatch = projectsRaw.match(/window\.NIRMAN_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
if (!arrayLiteralMatch) throw new Error('Could not parse NIRMAN_PROJECTS.');
const projects = new Function('return ' + arrayLiteralMatch[1])();

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function slug(name){ return name; } // keep canonical name (handles Lahaul-Spiti hyphen already)

function renderPage(d, projectsInDist) {
  const total = projectsInDist.length;
  const active = projectsInDist.filter(p => p.status === 'active').length;
  const completed = projectsInDist.filter(p => p.status === 'completed').length;
  const flagged = projectsInDist.filter(p => p.delayed && p.status === 'active').length;
  const totalBudget = projectsInDist.reduce((a, p) => a + (p.budget || 0), 0);
  const url = SITE + 'districts/' + d.name + '/';

  const cards = projectsInDist.map(p => `
    <a class="proj-card" href="../../projects/${esc(p.id)}/">
      <div class="proj-meta">
        <span class="pill ${p.status === 'completed' ? 'completed' : (p.delayed ? 'delayed' : 'active')}">${p.status === 'completed' ? 'Completed' : (p.delayed ? 'Delayed' : 'Active')}</span>
        <span>${esc(p.category)}</span>
      </div>
      <h3>${esc(p.name)}</h3>
      <div class="proj-foot">${p.progress}% · ₹${p.budget.toLocaleString('en-IN')} Cr · ${esc(p.contractor)}</div>
    </a>
  `).join('');

  const otherDistricts = DISTRICTS.filter(x => x.name !== d.name).map(x => `
    <li><a href="../${esc(x.name)}/">${esc(x.name)}</a></li>
  `).join('');

  const desc = `Public-works projects tracked in ${d.name} district, Himachal Pradesh: ${total} project${total === 1 ? '' : 's'} (${active} active, ${completed} completed${flagged ? ', ' + flagged + ' flagged' : ''}) covering ${[...new Set(projectsInDist.map(p => p.category))].join(', ')}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: d.name + ' district public-works — Nirman Darpan',
    description: desc,
    url,
    isPartOf: { '@id': SITE + '#website' },
    about: {
      '@type': 'AdministrativeArea',
      name: d.name + ' district',
      containedInPlace: { '@type': 'AdministrativeArea', name: 'Himachal Pradesh, India' },
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: total,
      itemListElement: projectsInDist.map((p, i) => ({
        '@type': 'ListItem', position: i + 1, url: SITE + 'projects/' + p.id + '/',
      })),
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.name)} district public works · Nirman Darpan</title>
<meta name="description" content="${esc(desc.slice(0, 300))}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(d.name)} district public works — Nirman Darpan">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+Devanagari:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../pages.css">
<style>
  .dist-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1px;background:#e7e6dd;border:1px solid #e7e6dd;border-radius:10px;overflow:hidden;margin:20px 0}
  .dist-stats .cell{background:#fff;padding:14px 16px}
  .dist-stats .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#9a9888}
  .dist-stats .v{font-family:'Source Serif 4',serif;font-size:24px;font-weight:600;margin-top:4px;color:#1b5640}
  .dist-stats .v.flag{color:#b3721f}
  .dist-stats .sub{font-size:11px;color:#8a8a7e;margin-top:2px}
  .projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin:24px 0}
  .proj-card{background:#fff;border:1px solid #e7e6dd;border-radius:10px;padding:16px;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s;display:block}
  .proj-card:hover{border-color:#1b5640;box-shadow:0 10px 24px -14px rgba(18,60,44,.3)}
  .proj-card h3{font-family:'Source Serif 4',serif;font-size:16px;margin:6px 0;color:#232a2e;line-height:1.3}
  .proj-meta{font-size:11px;color:#7d8a82;display:flex;gap:8px;align-items:center}
  .proj-foot{font-size:11px;color:#7d8a82;margin-top:4px}
  .pill{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:4px}
  .pill.active{background:#e7f0ea;color:#1b5640}
  .pill.completed{background:#dde5e6;color:#3f6b6e}
  .pill.delayed{background:#fdf0dc;color:#b3721f}
  .other-districts{list-style:none;padding:0;margin:12px 0;display:flex;flex-wrap:wrap;gap:8px}
  .other-districts li{margin:0}
  .other-districts a{font-size:12px;color:#1b5640;background:#e7f0ea;border-radius:999px;padding:4px 12px;text-decoration:none;font-weight:600}
  .other-districts a:hover{background:#1b5640;color:#fff}
  .dc-link{font-size:13px;color:#5c686f;margin-top:14px}
</style>
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>
<body>
<header class="page-header"><div class="page-header-inner">
  <a href="../../" class="brand"><span class="hi">निर्माण दर्पण</span><span class="en">Nirman Darpan</span></a>
  <a href="../../" class="back-link">← Back to tracker</a>
</div></header>
<main class="page-main">
  <p class="page-eyebrow">District · Himachal Pradesh</p>
  <h1>${esc(d.name)} district public works.</h1>
  <p class="lede">${esc(d.blurb)}</p>

  <div class="dist-stats">
    <div class="cell"><div class="lbl">Tracked projects</div><div class="v">${total}</div><div class="sub">across categories</div></div>
    <div class="cell"><div class="lbl">Active</div><div class="v">${active}</div><div class="sub">in progress</div></div>
    <div class="cell"><div class="lbl">Completed</div><div class="v" style="color:#3f6b6e">${completed}</div><div class="sub">delivered</div></div>
    <div class="cell"><div class="lbl">Tracked outlay</div><div class="v" style="color:#232a2e">₹${totalBudget.toLocaleString('en-IN')} Cr</div><div class="sub">reported</div></div>
    ${flagged ? `<div class="cell"><div class="lbl">Flagged</div><div class="v flag">${flagged}</div><div class="sub">behind schedule</div></div>` : ''}
  </div>

  <h2>Projects in ${esc(d.name)}</h2>
  <p style="font-size:13px;color:#7d8a82;margin:0 0 6px">Click any project for status, contractor, accountable leads, milestones and press coverage.</p>
  <div class="projects-grid">${cards || '<p style="font-size:13px;color:#a4a294;font-style:italic">No projects yet tracked in this district — they will appear here as the dataset grows.</p>'}</div>

  <h2>Other districts</h2>
  <ul class="other-districts">${otherDistricts}</ul>
  <p class="dc-link">District headquarters: <b>${esc(d.hq)}</b>. <a href="../../">View all 32 projects on the main tracker →</a></p>

  <p class="updated-stamp">Last refreshed: ${new Date().toISOString().slice(0, 10)}</p>
</main>
<footer class="page-footer"><div class="page-footer-inner">
  <nav>
    <a href="../../">Home</a>
    <a href="../../projects/">All projects</a>
    <a href="../../about/">About</a>
    <a href="../../methodology/">Methodology</a>
    <a href="../../corrections/">Corrections</a>
    <a href="../../privacy/">Privacy</a>
  </nav>
  <p class="page-footer-note">निर्माण दर्पण · Nirman Darpan — independent civic-transparency project for Himachal Pradesh.</p>
</div></footer>
</body>
</html>
`;
}

for (const d of DISTRICTS) {
  const inDist = projects.filter(p => (p.dists || []).includes(d.name));
  const html = renderPage(d, inDist);
  const dir = join(root, 'districts', d.name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
}

// Index page for /districts/
const districtIndex = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>All 12 HP districts · Nirman Darpan</title>
<meta name="description" content="Public-works projects tracked across all 12 districts of Himachal Pradesh on Nirman Darpan. Click any district for its project list and stats.">
<link rel="canonical" href="${SITE}districts/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+Devanagari:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../pages.css">
<style>
  .dist-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:20px}
  .dist-card{background:#fff;border:1px solid #e7e6dd;border-radius:10px;padding:14px 16px;text-decoration:none;color:inherit;transition:border-color .15s}
  .dist-card:hover{border-color:#1b5640}
  .dist-card h3{font-family:'Source Serif 4',serif;font-size:18px;margin:0 0 4px;color:#123c2c}
  .dist-card .count{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5c686f}
  .dist-card small{display:block;color:#7d8a82;font-size:11px;margin-top:6px;line-height:1.5}
</style>
</head>
<body>
<header class="page-header"><div class="page-header-inner">
  <a href="../" class="brand"><span class="hi">निर्माण दर्पण</span><span class="en">Nirman Darpan</span></a>
  <a href="../" class="back-link">← Back to tracker</a>
</div></header>
<main class="page-main">
  <p class="page-eyebrow">Districts</p>
  <h1>All 12 districts of Himachal Pradesh.</h1>
  <p class="lede">Click any district to see the public-works projects we track there.</p>
  <div class="dist-grid">
    ${DISTRICTS.map(d => {
      const inDist = projects.filter(p => (p.dists || []).includes(d.name));
      return `<a class="dist-card" href="${esc(d.name)}/">
        <h3>${esc(d.name)}</h3>
        <div class="count">${inDist.length} project${inDist.length === 1 ? '' : 's'} · HQ ${esc(d.hq)}</div>
        <small>${esc(d.blurb)}</small>
      </a>`;
    }).join('')}
  </div>
</main>
<footer class="page-footer"><div class="page-footer-inner">
  <nav>
    <a href="../">Home</a>
    <a href="../projects/">All projects</a>
    <a href="../about/">About</a>
    <a href="../methodology/">Methodology</a>
    <a href="../corrections/">Corrections</a>
    <a href="../privacy/">Privacy</a>
  </nav>
  <p class="page-footer-note">निर्माण दर्पण · Nirman Darpan — independent civic-transparency project for Himachal Pradesh.</p>
</div></footer>
</body>
</html>
`;
await writeFile(join(root, 'districts', 'index.html'), districtIndex, 'utf8');

console.log(`Generated ${DISTRICTS.length} district pages + 1 districts index.`);
