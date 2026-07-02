// scripts/gen_project_pages.mjs
// Generate a static HTML page per project at /projects/<id>/index.html.
//
// Why: each page is a dedicated, content-rich URL that Google can crawl and
// rank for queries like "Atal Tunnel status" or "Kiratpur Nerchowk highway
// progress". The main app's ?project=ID deep link still works and redirects
// to the canonical /projects/<id>/ URL.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SITE = 'https://raviknight.github.io/nirman-darpan/';

// Parse projects.js -> JS-evaluated array. The file assigns to window.NIRMAN_PROJECTS;
// we extract the array literal and Function-eval it (sandboxed enough — same repo).
const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const arrayLiteralMatch = projectsRaw.match(/window\.NIRMAN_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
if (!arrayLiteralMatch) throw new Error('Could not extract NIRMAN_PROJECTS literal.');
const projects = new Function('return ' + arrayLiteralMatch[1])();
console.log(`Loaded ${projects.length} projects.`);

const featuredIdMatch = projectsRaw.match(/window\.NIRMAN_FEATURED_ID\s*=\s*['"]([^'"]+)['"]/);
const featuredId = featuredIdMatch ? featuredIdMatch[1] : projects[0].id;

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
const LEVEL_LABEL = { center: 'Centre', state: 'State', district: 'District' };

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const INR = (n) => '₹' + Number(n).toLocaleString('en-IN') + ' Cr';

function relatedProjects(p) {
  // Pick up to 5 other projects: same district + same category, weighted.
  const byScore = projects
    .filter(q => q.id !== p.id)
    .map(q => {
      let score = 0;
      const sharedDists = q.dists.filter(d => p.dists.includes(d));
      score += sharedDists.length * 3;
      if (q.category === p.category) score += 2;
      if (q.level === p.level) score += 1;
      return { p: q, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.p);
  return byScore;
}

async function loadSocialSnap(id) {
  try {
    const raw = await readFile(join(root, 'data', 'social', id + '.json'), 'utf8');
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function jsonLd(p) {
  const completed = p.status === 'completed';
  const desc = p.desc || p.name;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': SITE + 'projects/' + p.id + '/#article',
        headline: p.name,
        description: desc,
        articleSection: p.category,
        about: {
          '@type': 'Place',
          name: p.districtLabel,
          containedInPlace: { '@type': 'AdministrativeArea', name: 'Himachal Pradesh, India' },
        },
        keywords: [p.name, p.category, ...p.dists, p.contractor, p.owner, 'Himachal Pradesh'].join(', '),
        url: SITE + 'projects/' + p.id + '/',
        publisher: { '@type': 'Organization', name: 'Nirman Darpan', url: SITE },
        isPartOf: { '@id': SITE + '#dataset' },
      },
      {
        '@type': 'Place',
        name: p.name,
        description: desc,
        address: { '@type': 'PostalAddress', addressRegion: 'Himachal Pradesh', addressCountry: 'IN' },
        ...(p.coords ? { geo: { '@type': 'GeoCoordinates', latitude: p.coords[0], longitude: p.coords[1] } } : {}),
      },
    ],
  };
}

function renderPage(p, social, related) {
  const c = CAT_COLOR[p.category] || '#5c686f';
  const completed = p.status === 'completed';
  const url = SITE + 'projects/' + p.id + '/';
  const statusText = completed ? 'Completed' : (p.delayed ? 'Active · behind schedule' : 'Active · on track');
  const fc = completed ? '#3f6b6e' : (p.delayed ? '#b3721f' : '#1b5640');
  const metaDescBase = `${p.name} (${p.category}, ${p.districtLabel}, ${LEVEL_LABEL[p.level||'center']}-level): ${statusText}, ${p.progress}% complete, ₹${p.budget.toLocaleString('en-IN')} Cr outlay. Awarded by ${p.awardedBy}; executed by ${p.contractor}. Tracked independently on Nirman Darpan.`;
  const metaDesc = metaDescBase.slice(0, 300);

  const milestonesHtml = (p.milestones || []).map(m => `
    <li class="ms ${m.done ? 'done' : ''}">
      <span class="ms-mark">${m.done ? '✓' : '○'}</span>
      <span class="ms-text"><b>${esc(m.l)}</b><span class="ms-date">${esc(m.d)}</span></span>
    </li>
  `).join('');

  const leadsHtml = (p.leads || []).map(l => `
    <li><b>${esc(l.n)}</b><br><span class="role">${esc(l.r)}</span></li>
  `).join('');

  const sourcesHtml = (p.sources || []).map(s => {
    const ico = s.t === 'gov' ? '🏛' : s.t === 'press' ? '📰' : '✔';
    return `<li>${ico} ${esc(s.n)}</li>`;
  }).join('');

  // External-link block: Wikipedia (if known), YouTube search, Google search.
  const ytQuery = encodeURIComponent(p.name + ' Himachal Pradesh');
  const ytUrl = 'https://www.youtube.com/results?search_query=' + ytQuery;
  const gQuery = encodeURIComponent('"' + p.name + '"');
  const gUrl = 'https://www.google.com/search?q=' + gQuery;
  const externalLinks = [
    p.wikipedia_url ? `<li><a href="${esc(p.wikipedia_url)}" target="_blank" rel="noopener">📖 Wikipedia article</a><small>Background, history, sourced citations on Wikipedia.</small></li>` : '',
    `<li><a href="${esc(ytUrl)}" target="_blank" rel="noopener">▶ Videos on YouTube</a><small>News coverage and resident-shot footage.</small></li>`,
    `<li><a href="${esc(gUrl)}" target="_blank" rel="noopener">🔍 Google search</a><small>Wider press, government notes, social mentions.</small></li>`,
  ].filter(Boolean).join('');

  const pressMentionsHtml = (social && social.mentions && social.mentions.length)
    ? social.mentions.slice(0, 8).map(m => `
        <li>
          <a href="${esc(m.url)}" target="_blank" rel="noopener nofollow">${esc(m.title)}</a>
          <small>${esc(m.source || 'News')}${m.lang === 'hi' ? ' · हिं' : (m.lang === 'en' ? ' · EN' : '')}</small>
        </li>
      `).join('')
    : '<li class="empty">No press mentions captured in the latest sweep.</li>';

  const relatedHtml = related.map(r => `
    <li><a href="../${esc(r.id)}/">${esc(r.name)}</a><small>${esc(r.districtLabel)} · ${esc(r.category)}</small></li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.name)} · ${esc(p.districtLabel)} · Nirman Darpan</title>
<meta name="description" content="${esc(metaDesc)}">
<meta name="keywords" content="${esc([p.name, p.category, p.contractor, p.owner, ...p.dists, 'Himachal Pradesh public works'].join(', '))}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en-IN" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.name)} · ${esc(p.districtLabel)} — Nirman Darpan">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Nirman Darpan">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(p.name)} · Nirman Darpan">
<meta name="twitter:description" content="${esc(metaDesc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+Devanagari:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../pages.css">
<style>
  .project-photo{margin:18px 0 24px}
  .project-photo img{width:100%;max-height:380px;object-fit:cover;border-radius:12px;border:1px solid #e7e6dd;display:block}
  .project-photo figcaption{font-size:11px;color:#8a8a7e;margin-top:6px;text-align:right}
  .project-photo figcaption a{color:#5c686f;text-decoration:underline}
  .project-hero{
    background:#fff;border:1px solid #e7e6dd;border-radius:14px;
    padding:24px 26px;margin-bottom:24px;
  }
  .meta-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;font-size:13px;color:#5c686f}
  .meta-row .cat{display:inline-flex;align-items:center;gap:7px;font-weight:600}
  .meta-row .cat-dot{width:11px;height:11px;border-radius:2px;background:${c}}
  .meta-row .id{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a4a294;margin-left:auto}
  .level-tag{display:inline-block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;padding:3px 8px;border-radius:5px}
  .lvl-center{background:#e8eef4;color:#3a5a7d}
  .lvl-state{background:#eef4ec;color:#3f6b4a}
  .lvl-district{background:#f5eee4;color:#7d5a3a}
  .status-row{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap}
  .status-pill{font-size:12px;font-weight:600;color:#fff;padding:5px 11px;border-radius:6px}
  .status-pill.active{background:#1b5640}
  .status-pill.completed{background:#3f6b6e}
  .status-pill.delayed{background:#b3721f}
  .progress-bar{height:10px;background:#ecebe2;border-radius:999px;overflow:hidden;margin:8px 0}
  .progress-bar > div{height:100%;background:${fc};border-radius:999px}
  .facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1px;background:#e7e6dd;border:1px solid #e7e6dd;border-radius:10px;overflow:hidden;margin:18px 0}
  .facts .cell{background:#fff;padding:13px 16px}
  .facts .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#9a9888}
  .facts .v{font-size:14px;margin-top:3px;line-height:1.4;color:#232a2e}
  .facts .v.mono{font-family:'IBM Plex Mono',monospace}
  .leads-list, .sources-list, .related-list, .press-list{list-style:none;padding:0;margin:12px 0}
  .leads-list li{background:#fff;border:1px solid #e7e6dd;border-radius:8px;padding:10px 14px;margin:6px 0;font-size:13px}
  .leads-list .role{color:#7d8a82;font-size:12px}
  .sources-list li{font-size:13px;padding:4px 0}
  .related-list li, .press-list li, .external-list li{font-size:13px;padding:6px 0;border-bottom:1px solid #f0eee4}
  .related-list li:last-child, .press-list li:last-child, .external-list li:last-child{border-bottom:none}
  .related-list a, .press-list a, .external-list a{font-weight:500}
  .related-list small, .press-list small, .external-list small{display:block;color:#8a8a7e;font-size:11px;margin-top:2px}
  .ms{display:flex;gap:10px;padding:8px 0;list-style:none}
  .ms-mark{font-weight:700;color:#cfcdbf;width:18px;flex-shrink:0;text-align:center}
  .ms.done .ms-mark{color:#1b5640}
  .ms-text{font-size:13px;color:#5c686f}
  .ms.done .ms-text{color:#232a2e}
  .ms-text b{display:block;font-weight:500}
  .ms-date{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a4a294}
  .open-app{
    display:inline-flex;align-items:center;gap:8px;
    background:#1b5640;color:#fff;text-decoration:none;font-weight:600;
    padding:11px 18px;border-radius:8px;font-size:14px;
  }
  .open-app:hover{background:#2f7d52}
  .empty{color:#a4a294;font-style:italic}
</style>
<script type="application/ld+json">
${JSON.stringify(jsonLd(p), null, 2)}
</script>
</head>
<body>

<header class="page-header">
  <div class="page-header-inner">
    <a href="../../" class="brand">
      <span class="hi">निर्माण दर्पण</span>
      <span class="en">Nirman Darpan</span>
    </a>
    <a href="../../" class="back-link">← All projects</a>
  </div>
</header>

<main class="page-main">
  <p class="page-eyebrow">${esc(p.category)} · ${esc(p.districtLabel)} · ${LEVEL_LABEL[p.level||'center']}-level</p>
  <h1>${esc(p.name)}</h1>
  <p class="lede">${esc(p.desc)}</p>

  ${p.image_url ? `
    <figure class="project-photo">
      <img src="${esc(p.image_url)}" alt="${esc(p.name)} — photograph" loading="lazy">
      <figcaption>${esc(p.image_credit || 'Photo via Wikipedia')}${p.wikipedia_url ? ` · <a href="${esc(p.wikipedia_url)}" target="_blank" rel="noopener">Source article</a>` : ''}</figcaption>
    </figure>
  ` : ''}

  <section class="project-hero">
    <div class="meta-row">
      <span class="cat"><span class="cat-dot"></span>${esc(p.category)}</span>
      <span class="level-tag lvl-${p.level||'center'}">${LEVEL_LABEL[p.level||'center']}</span>
      <span>◎ ${esc(p.districtLabel)}</span>
      <span class="id">${esc(p.id)}</span>
    </div>

    <div class="status-row">
      <span class="status-pill ${completed ? 'completed' : 'active'}">${completed ? 'Completed' : 'In progress'}</span>
      ${!completed && p.delayed ? '<span class="status-pill delayed">⚠ Behind schedule</span>' : ''}
      <span style="font-size:13px;color:#5c686f"><b>${p.progress}%</b> complete · ${completed ? ('Delivered ' + esc(p.completed||p.eta)) : ('ETA ' + esc(p.eta))}</span>
    </div>

    <div class="progress-bar"><div style="width:${p.progress}%"></div></div>
    <div style="font-size:11px;color:#a4a294;margin-top:4px">Progress is a reported figure${p.progress_asof ? ` (as of ${esc(p.progress_asof)})` : ''}${p.progress_source ? ` · <a href="${esc(p.progress_source)}" target="_blank" rel="noopener nofollow" style="color:#5c686f">source ↗</a>` : ''} — curated from public records, not independently surveyed.</div>

    <div class="facts">
      <div class="cell"><div class="lbl">Awarded by</div><div class="v">${esc(p.awardedBy)}</div></div>
      <div class="cell"><div class="lbl">${(p.contractors && p.contractors.length > 1) ? 'Contractors' : 'Contractor / executor'}</div><div class="v">${(p.contractors && p.contractors.length) ? '<ul style="margin:0;padding-left:18px">' + p.contractors.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : esc(p.contractor)}</div></div>
      <div class="cell"><div class="lbl">Owning department</div><div class="v">${esc(p.owner)}</div></div>
      <div class="cell"><div class="lbl">Sanctioned outlay</div><div class="v mono">${INR(p.budget)}<br><span style="color:#9a9888;font-size:11px">${INR(p.spent)} spent</span></div></div>
      <div class="cell"><div class="lbl">Started</div><div class="v mono">${esc(p.start)}</div></div>
      <div class="cell"><div class="lbl">${completed ? 'Completed' : 'Target completion'}</div><div class="v mono" style="color:${!completed && p.delayed ? '#b3721f' : '#232a2e'}">${esc(completed ? (p.completed||p.eta) : p.eta)}</div></div>
    </div>

    <p style="margin:20px 0 0">
      <a href="../../?project=${esc(p.id)}" class="open-app">Open interactive panel →</a>
      <span style="margin-left:12px;font-size:12px;color:#7d8a82">Comments, voting, accountability flags live in the interactive view.</span>
    </p>
  </section>

  <h2>Who's accountable</h2>
  <ul class="leads-list">${leadsHtml}</ul>

  <h2>Timeline</h2>
  <ul style="padding:0;margin:12px 0">${milestonesHtml}</ul>

  <h2>Press coverage</h2>
  <p style="font-size:13px;color:#7d8a82;margin:0 0 6px">
    ${social && social.counts ? `<b>${social.counts.total}</b> press mentions aggregated from Indian publishers (English + Hindi).` : 'No press snapshot available yet — refreshes weekly via the auto-sync workflow.'}
  </p>
  <ul class="press-list">${pressMentionsHtml}</ul>

  <h2>Sources</h2>
  <ul class="sources-list">${sourcesHtml}</ul>

  <h2>Look up more</h2>
  <ul class="external-list">${externalLinks}</ul>

  <h2>Related projects</h2>
  <p style="font-size:13px;color:#7d8a82;margin:0 0 6px">Other public works tracked on Nirman Darpan, weighted by shared district and category.</p>
  <ul class="related-list">${relatedHtml}</ul>

  <p class="updated-stamp">Last refreshed: ${new Date().toISOString().slice(0, 10)} · Project ID: <code>${esc(p.id)}</code></p>
</main>

<footer class="page-footer">
  <div class="page-footer-inner">
    <nav>
      <a href="../../">Home</a>
      <a href="../../about/">About</a>
      <a href="../../methodology/">Methodology</a>
      <a href="../../corrections/">Corrections</a>
      <a href="../../privacy/">Privacy</a>
      <a href="../../funding/">Funding</a>
      <a href="../../code-of-conduct/">Code of Conduct</a>
    </nav>
    <p class="page-footer-note">निर्माण दर्पण · Nirman Darpan — independent civic-transparency project for Himachal Pradesh. Not affiliated with any government or party. Figures may contain reporting lags or errors — see <a href="../../corrections/">corrections</a> to report one.</p>
  </div>
</footer>
</body>
</html>
`;
}

// Build them
for (const p of projects) {
  const social = await loadSocialSnap(p.id);
  const related = relatedProjects(p);
  const html = renderPage(p, social, related);
  const dir = join(root, 'projects', p.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
}

// Index page that lists all projects (handy for crawlers + visitors)
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>All projects · Nirman Darpan</title>
<meta name="description" content="Full list of ${projects.length} public-works projects tracked on Nirman Darpan, across all 12 districts of Himachal Pradesh.">
<link rel="canonical" href="${SITE}projects/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+Devanagari:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../pages.css">
<style>
  .projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:20px}
  .proj-card{background:#fff;border:1px solid #e7e6dd;border-radius:10px;padding:16px;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s}
  .proj-card:hover{border-color:#1b5640;box-shadow:0 10px 24px -14px rgba(18,60,44,.3)}
  .proj-card h3{font-family:'Source Serif 4',serif;font-size:16px;margin:0 0 6px;color:#232a2e;line-height:1.3}
  .proj-meta{font-size:11px;color:#7d8a82;display:flex;gap:8px;align-items:center;margin-bottom:4px}
  .pill{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:4px}
  .pill.active{background:#e7f0ea;color:#1b5640}
  .pill.completed{background:#dde5e6;color:#3f6b6e}
  .pill.delayed{background:#fdf0dc;color:#b3721f}
</style>
</head>
<body>
<header class="page-header"><div class="page-header-inner">
  <a href="../" class="brand"><span class="hi">निर्माण दर्पण</span><span class="en">Nirman Darpan</span></a>
  <a href="../" class="back-link">← Back to tracker</a>
</div></header>
<main class="page-main">
  <p class="page-eyebrow">Projects</p>
  <h1>All ${projects.length} projects on Nirman Darpan.</h1>
  <p class="lede">Public-works projects tracked across all 12 districts of Himachal Pradesh — highways, hydropower, hospitals, rail, smart-city schemes, water supply, schools, disaster restoration.</p>
  <div class="projects-grid">
    ${projects.map(p => `
      <a href="${esc(p.id)}/" class="proj-card">
        <div class="proj-meta">
          <span class="pill ${p.status === 'completed' ? 'completed' : (p.delayed ? 'delayed' : 'active')}">${p.status === 'completed' ? 'Completed' : (p.delayed ? 'Delayed' : 'Active')}</span>
          <span>${esc(p.category)}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <div style="font-size:12px;color:#5c686f">◎ ${esc(p.districtLabel)} · ₹${p.budget.toLocaleString('en-IN')} Cr</div>
      </a>
    `).join('')}
  </div>
</main>
<footer class="page-footer"><div class="page-footer-inner">
  <nav>
    <a href="../">Home</a>
    <a href="../about/">About</a>
    <a href="../methodology/">Methodology</a>
    <a href="../corrections/">Corrections</a>
    <a href="../privacy/">Privacy</a>
    <a href="../funding/">Funding</a>
    <a href="../code-of-conduct/">Code of Conduct</a>
  </nav>
  <p class="page-footer-note">निर्माण दर्पण · Nirman Darpan — independent civic-transparency project for Himachal Pradesh.</p>
</div></footer>
</body>
</html>
`;
await writeFile(join(root, 'projects', 'index.html'), indexHtml, 'utf8');

console.log(`Generated ${projects.length} project pages + 1 index page.`);
