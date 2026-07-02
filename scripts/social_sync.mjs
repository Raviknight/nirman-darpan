// scripts/social_sync.mjs — populate data/social/<project_id>.json
// from free press sources.
//
// Strategy: Google News RSS is the primary, querying once per project query
// across en-IN + hi-IN locales. It aggregates results from thousands of
// Indian publishers and is designed to be queried (no anti-bot 403s).
// We also poll a small list of static publisher RSS endpoints as a backup.
//
// Deliberately excluded (per the project's free-only + no-skew constraints):
//   - Reddit (skews young/urban/English; not representative of HP residents)
//   - Twitter/X (paid since 2023)
//   - Facebook / Instagram (public post search deprecated since 2018)
//   - Bluesky / Mastodon (negligible Indian volume in 2026)
//
// No automated sentiment scoring. We surface headlines and links so readers
// form their own impression. Aggregation, not adjudication.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const cfg = JSON.parse(await readFile(join(root, 'data/rss_feeds.json'), 'utf8'));

const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const projects = [];
const projectRe = /id:'([^']+)'[\s\S]*?social_queries:(\[[^\]]*\])(?:[^\n]*?exclude_terms:(\[[^\]]*\]))?/g;
let m;
while ((m = projectRe.exec(projectsRaw)) !== null) {
  const id = m[1];
  const queries = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
  const excludes = m[3] ? [...m[3].matchAll(/'([^']+)'/g)].map(x => x[1].toLowerCase()) : [];
  projects.push({ id, queries, excludes });
}
console.log(`Loaded ${projects.length} projects with social_queries.`);

// ---------------------------------------------------------------------------
// Relevance filters. Google News quoted-phrase search still returns loosely
// related coverage (e.g. Nepal infrastructure stories on a Shimla project
// because a phrase token appears in the body). Three layers:
//
// 1. GEO BLOCKLIST — drop items naming other countries/regions unless the
//    title also names Himachal explicitly.
// 2. Per-project exclude_terms — optional array on each project in
//    projects.js for project-specific false-positive patterns.
// 3. Cross-portal dedup — the same story syndicates across portals with
//    near-identical titles. Normalise (strip the ' - Publisher' suffix,
//    lowercase, collapse to alphanumerics) and keep the first occurrence.
// ---------------------------------------------------------------------------

const GEO_BLOCKLIST = [
  'nepal', 'kathmandu', 'pokhara', 'pakistan', 'lahore', 'karachi', 'islamabad',
  'bangladesh', 'dhaka', 'sri lanka', 'colombo', 'bhutan', 'thimphu',
  'नेपाल', 'काठमांडू', 'पाकिस्तान', 'बांग्लादेश',
];
const HP_MARKERS = [
  'himachal', 'shimla', 'mandi', 'kangra', 'kullu', 'solan', 'bilaspur',
  'hamirpur', 'una', 'chamba', 'sirmaur', 'kinnaur', 'lahaul', 'spiti',
  'dharamshala', 'manali', 'rohtang', 'हिमाचल', 'शिमला', 'मंडी', 'कांगड़ा',
  'कुल्लू', 'सोलन', 'बिलासपुर', 'हमीरपुर', 'ऊना', 'चंबा', 'सिरमौर', 'किन्नौर',
];

function passesGeoFilter(text) {
  const t = text.toLowerCase();
  const blockedHit = GEO_BLOCKLIST.some(g => t.includes(g));
  if (!blockedHit) return true;
  // Blocked geo named — only keep if Himachal context is explicit too
  return HP_MARKERS.some(h => t.includes(h));
}

function normaliseTitle(title) {
  // Strip trailing ' - Publisher' that Google News appends, then collapse.
  const base = title.replace(/\s+[-–—|]\s+[^-–—|]{2,60}$/, '');
  return base.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, '').slice(0, 80);
}

const UA = 'Mozilla/5.0 (compatible; NirmanDarpanBot/1.0; +https://github.com/Raviknight/nirman-darpan)';

async function fetchText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml,application/xml,text/xml,*/*' },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFeed(xml) {
  const items = [];
  const blockRe = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let b;
  while ((b = blockRe.exec(xml)) !== null) {
    const block = b[0];
    const grab = (tag) => {
      const re = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
      const mm = block.match(re);
      return mm ? decodeEntities(mm[1]) : '';
    };
    const title = grab('title');
    if (!title) continue;
    let link = grab('link');
    if (!link) {
      const lm = block.match(/<link\b[^>]*href="([^"]+)"/i);
      if (lm) link = lm[1];
    }
    const date = grab('pubDate') || grab('published') || grab('updated') || '';
    const desc = grab('description') || grab('summary') || grab('content') || '';
    items.push({ title, link, date, desc });
  }
  return items;
}

// Google News dresses publisher names inside <source>...</source>.
function grabSource(blockMatch) {
  const mm = blockMatch.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);
  return mm ? decodeEntities(mm[1]) : '';
}

function parseGoogleFeed(xml) {
  const items = [];
  const blockRe = /<item\b[\s\S]*?<\/item>/gi;
  let b;
  while ((b = blockRe.exec(xml)) !== null) {
    const block = b[0];
    const grab = (tag) => {
      const re = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
      const mm = block.match(re);
      return mm ? decodeEntities(mm[1]) : '';
    };
    const title = grab('title');
    if (!title) continue;
    const link = grab('link');
    const date = grab('pubDate');
    const desc = grab('description');
    const source = grabSource(block);
    items.push({ title, link, date, desc, source });
  }
  return items;
}

const allCounts = {};
await mkdir(join(root, 'data/social'), { recursive: true });

// Pre-fetch static backup feeds once.
const staticItems = [];
for (const f of (cfg.static_feeds || [])) {
  try {
    const xml = await fetchText(f.url);
    const items = parseFeed(xml);
    items.forEach(it => staticItems.push({ ...it, feed: f }));
    console.log(`static ${f.id}: ${items.length} items`);
  } catch (e) {
    console.log(`static ${f.id}: FAIL ${e.message}`);
  }
}

// Per project, hit Google News with each query × locale, plus check static items.
for (const p of projects) {
  const collected = [];

  if (cfg.google_news && cfg.google_news.enabled) {
    for (const q of p.queries) {
      for (const loc of cfg.google_news.locales) {
        const url = `${cfg.google_news.endpoint}?q=${encodeURIComponent('"' + q + '"')}` +
                    `&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`;
        try {
          const xml = await fetchText(url);
          const items = parseGoogleFeed(xml);
          for (const it of items) {
            collected.push({
              title: it.title.slice(0, 240),
              source: it.source || 'Google News (India)',
              source_id: 'google-news-' + loc.tag,
              url: it.link,
              date: safeIso(it.date),
              kind: 'press',
              lang: loc.tag,
              match: q,
            });
          }
        } catch (e) {
          // tolerate transient failures — Google News is usually fine
        }
      }
    }
  }

  // Static-feed backup
  for (const it of staticItems) {
    const hay = (it.title + ' ' + it.desc).toLowerCase();
    const hit = p.queries.find(q => hay.includes(q.toLowerCase()));
    if (!hit) continue;
    collected.push({
      title: it.title.slice(0, 240),
      source: it.feed.name,
      source_id: it.feed.id,
      url: it.link,
      date: safeIso(it.date),
      kind: it.feed.kind || 'press',
      lang: 'en',
      match: hit,
    });
  }

  // Relevance filters, then dedupe.
  const seenUrl = new Set();
  const seenTitle = new Set();
  let droppedGeo = 0, droppedExclude = 0, droppedDupTitle = 0;
  const dedup = collected.filter(x => {
    if (!x.url) return false;
    // 1. Geo blocklist — drop off-region stories with no Himachal context
    if (!passesGeoFilter(x.title)) { droppedGeo++; return false; }
    // 2. Per-project exclude terms
    const tl = x.title.toLowerCase();
    if (p.excludes && p.excludes.some(e => tl.includes(e))) { droppedExclude++; return false; }
    // 3. URL dedup (strip tracking query)
    const key = x.url.split('?')[0];
    if (seenUrl.has(key)) return false;
    seenUrl.add(key);
    // 4. Cross-portal title dedup — same story syndicated with near-identical
    //    headline across publishers
    const nt = normaliseTitle(x.title);
    if (nt.length > 15 && seenTitle.has(nt)) { droppedDupTitle++; return false; }
    seenTitle.add(nt);
    return true;
  });
  if (droppedGeo || droppedExclude || droppedDupTitle) {
    console.log(`  ${p.id}: dropped ${droppedGeo} geo, ${droppedExclude} excluded, ${droppedDupTitle} dup-title`);
  }
  dedup.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const counts = { press: 0, gov: 0, en: 0, hi: 0, total: dedup.length };
  for (const e of dedup) {
    counts[e.kind] = (counts[e.kind] || 0) + 1;
    counts[e.lang] = (counts[e.lang] || 0) + 1;
  }

  const payload = {
    updated_at: new Date().toISOString(),
    project_id: p.id,
    counts,
    mentions: dedup.slice(0, 20),
    methodology: 'Google News (India) en-IN + hi-IN + a small static publisher backup. Phrase match, geo-blocklist (off-region stories dropped unless Himachal named), per-project exclude terms, URL + cross-portal title dedup. No automated sentiment — open a headline to read the source.',
  };
  await writeFile(join(root, `data/social/${p.id}.json`),
                  JSON.stringify(payload, null, 2) + '\n', 'utf8');
  allCounts[p.id] = counts.total;
}

console.log('Done.', allCounts);

function safeIso(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
