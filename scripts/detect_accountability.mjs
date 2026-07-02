// scripts/detect_accountability.mjs — scan press snapshots for accountability
// keywords and surface suggestions per project. Output is read-only suggestion
// JSON in data/accountability_suggestions/<id>.json; the site renders these as
// "Auto-detected from press" inside the Accountability panel, and a signed-in
// user can promote any of them to a real (pending-review) entry via the
// existing add-entry form.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Category-specific keyword sets. Lowercase, matched against title + summary.
// Order matters: first hit wins for the suggested category.
const KW = [
  { category: 'incident',   severity: 'high',   patterns: ['accident','fatality','death','died','killed','injured','collapsed','collapse','mishap','crashed','swept away','landslide kill'] },
  { category: 'litigation', severity: 'medium', patterns: ['pil','public interest litigation','ngt','national green tribunal','writ petition','high court','supreme court','court order','court orders','court directs','court verdict','court ruling','sho','arrested'] },
  { category: 'audit',      severity: 'medium', patterns: ['cag report','cag audit','cag finds','cag observation','cag-flagged','cag flagged','cag pulls up','performance audit','public accounts committee','pac observation','audit irregularity','audit irregularities','audit uncover','audit uncovers','financial irregularity','financial irregularities','irregularity','irregularities','embezzl'] },
  { category: 'grievance',  severity: 'low',    patterns: ['rti','right to information','cpgrams','grievance','memorandum','protest','dharna','agitation','demand','demanded','blocked road','farmers protest','residents protest'] },
  { category: 'defect',     severity: 'medium', patterns: ['pothole','potholes','crack','cracks','sub-standard','substandard','poor quality','shoddy','crumbling','damaged','rusted','leakage','water-logged','waterlogged','retaining wall failure','wall collapsed','quality issue','quality issues','defect','defects'] },
];

// Read social_queries from projects.js to know who we're scanning.
const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const arrayLiteralMatch = projectsRaw.match(/window\.NIRMAN_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
if (!arrayLiteralMatch) throw new Error('Could not parse NIRMAN_PROJECTS.');
const projects = new Function('return ' + arrayLiteralMatch[1])();

const outDir = join(root, 'data/accountability_suggestions');
await mkdir(outDir, { recursive: true });

function classify(text) {
  const t = text.toLowerCase();
  for (const k of KW) {
    for (const pat of k.patterns) {
      if (t.includes(pat)) return { category: k.category, severity: k.severity, matchedTerm: pat };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resolution detection. A story like "NGT dismisses plea" or "potholes
// repaired" keyword-matches a category but describes the CLOSURE of an issue,
// not a new one. Tag it so the editor uses "Mark addressed" on the existing
// record instead of approving a duplicate new entry.
// ---------------------------------------------------------------------------
const RESOLUTION_PATTERNS = [
  'completed', 'inaugurated', 'opened to traffic', 'reopened', 'restored',
  'repaired', 'resolved', 'clean chit', 'acquitted', 'dismissed', 'quashed',
  'disposed', 'case closed', 'closes case', 'withdrawn', 'settled',
  'compensation paid', 'compensation released', 'clearance granted',
  'relief to', 'gets relief', 'work resumes', 'work resumed', 'restarted',
  'पूरा', 'बहाल', 'मरम्मत', 'खारिज', 'निपटारा', 'क्लीन चिट', 'राहत',
];
function isResolutionStory(text) {
  const t = text.toLowerCase();
  return RESOLUTION_PATTERNS.some(r => t.includes(r));
}

// Normalised title for duplicate comparison across sweeps + against published
// records (same normalisation as social_sync's cross-portal dedup).
function normTitle(title) {
  const base = String(title || '').replace(/\s+[-–—|]\s+[^-–—|]{2,60}$/, '');
  return base.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, '').slice(0, 80);
}
function urlStem(u) { return String(u || '').split('?')[0]; }

// ---------------------------------------------------------------------------
// Cross-check against ALREADY-PUBLISHED accountability records so an approved
// story is never re-suggested. Records are publicly readable, so an
// unauthenticated REST read works from CI. Degrades gracefully offline.
// ---------------------------------------------------------------------------
const AW = {
  endpoint: 'https://nyc.cloud.appwrite.io/v1',
  project: '6a34470a0010b8e65407',
  db: '6a344b6f002c3a7ca279',
};
let publishedRecords = [];
try {
  const q = encodeURIComponent(JSON.stringify({ method: 'limit', values: [500] }));
  const r = await fetch(`${AW.endpoint}/databases/${AW.db}/collections/accountability_entries/documents?queries[]=${q}`, {
    headers: { 'X-Appwrite-Project': AW.project },
  });
  if (r.ok) {
    publishedRecords = (await r.json()).documents || [];
    console.log(`Cross-check: loaded ${publishedRecords.length} published records from Appwrite.`);
  }
} catch (e) {
  console.log('Cross-check: could not reach Appwrite (' + e.message + ') — skipping published-record dedup this run.');
}
const publishedUrlStems = new Set(publishedRecords.map(r => urlStem(r.source_url)).filter(Boolean));
const publishedByProject = {};
for (const r of publishedRecords) {
  (publishedByProject[r.project_id] = publishedByProject[r.project_id] || []).push({
    title: r.title, norm: normTitle(r.title), category: r.category, status: r.status,
  });
}

// first_seen persistence — lets the queue show how long a suggestion has been
// waiting, and makes recaptured items identifiable across sweeps.
const seenPath = join(outDir, 'seen.json');
let seen = {};
try { seen = JSON.parse(await readFile(seenPath, 'utf8')); } catch (_) {}

let totalSuggestions = 0;
let droppedPublished = 0;

for (const p of projects) {
  const snapPath = join(root, 'data', 'social', p.id + '.json');
  let snap;
  try { snap = JSON.parse(await readFile(snapPath, 'utf8')); }
  catch (_) { continue; }
  if (!snap.mentions || !snap.mentions.length) continue;

  const seenUrls = new Set();
  const suggestions = [];
  for (const m of snap.mentions) {
    if (!m.url || seenUrls.has(m.url)) continue;
    const hit = classify((m.title || '') + ' ' + (m.match || ''));
    if (!hit) continue;
    seenUrls.add(m.url);

    // Already published as a verified record? Never re-suggest.
    if (publishedUrlStems.has(urlStem(m.url))) { droppedPublished++; continue; }

    // Resolution-language story? Tag it — the editor should update the
    // matching published record (Mark addressed) rather than approve a new one.
    const resolution = isResolutionStory(m.title);

    // Title-similar to a published record on this project? Flag as a likely
    // duplicate / follow-up so the editor sees the connection.
    const nt = normTitle(m.title);
    let duplicateOf = null;
    for (const rec of (publishedByProject[p.id] || [])) {
      if (nt.length > 15 && rec.norm.length > 15 &&
          (nt === rec.norm || nt.includes(rec.norm.slice(0, 30)) || rec.norm.includes(nt.slice(0, 30)))) {
        duplicateOf = { title: rec.title, category: rec.category, status: rec.status };
        break;
      }
    }

    const stem = urlStem(m.url);
    if (!seen[stem]) seen[stem] = new Date().toISOString();

    suggestions.push({
      category: hit.category,
      severity: hit.severity,
      kind: resolution ? 'resolution' : 'issue',
      duplicate_of: duplicateOf,
      first_seen: seen[stem],
      title: m.title.slice(0, 200),
      summary: 'Auto-detected from press: "' + m.title.slice(0, 160) + '" — review the linked article and edit before promoting.',
      source_url: m.url,
      source_name: m.source || 'News',
      lang: m.lang || 'en',
      date: m.date,
      matched_term: hit.matchedTerm,
    });
  }

  const payload = {
    updated_at: new Date().toISOString(),
    project_id: p.id,
    count: suggestions.length,
    suggestions: suggestions.slice(0, 25),
    methodology: 'Keyword scan of press snapshot. False positives are normal — a signed-in moderator reviews each before promotion. Categories: incident, defect, audit, grievance, litigation.',
  };
  await writeFile(join(outDir, p.id + '.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  totalSuggestions += suggestions.length;
  if (suggestions.length) console.log(`  ${p.id}: ${suggestions.length} suggestions`);
}

// Write a manifest so the editorial queue (/admin/queue/) can discover
// which projects have suggestions without having to probe every project id.
const manifest = { generated_at: new Date().toISOString(), total_projects: 0, total_suggestions: 0, projects: [] };
for (const p of projects) {
  try {
    const j = JSON.parse(await readFile(join(outDir, p.id + '.json'), 'utf8'));
    if (j.count > 0) {
      manifest.projects.push({ id: j.project_id, count: j.count, updated_at: j.updated_at });
      manifest.total_suggestions += j.count;
    }
  } catch (_) {}
}
manifest.projects.sort((a, b) => b.count - a.count);
manifest.total_projects = manifest.projects.length;
await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Manifest: ${manifest.total_projects} projects, ${manifest.total_suggestions} suggestions.`);

// Persist first_seen map (cap at 10k stems to bound file size).
const seenKeys = Object.keys(seen);
if (seenKeys.length > 10000) {
  const trimmed = {};
  for (const k of seenKeys.slice(-10000)) trimmed[k] = seen[k];
  seen = trimmed;
}
await writeFile(seenPath, JSON.stringify(seen, null, 2) + '\n', 'utf8');

if (droppedPublished) console.log(`Dropped ${droppedPublished} suggestions already published as verified records.`);
console.log(`Done. ${totalSuggestions} total suggestions across ${projects.length} projects.`);
