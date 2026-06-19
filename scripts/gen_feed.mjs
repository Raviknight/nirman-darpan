// scripts/gen_feed.mjs — produce /feed.xml (Atom).
// One entry per tracked project. Readers can subscribe via any RSS / Atom
// reader and be notified when project records change or new projects are
// added. The feed timestamp tracks the most recent dataset refresh.

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SITE = 'https://raviknight.github.io/nirman-darpan/';

const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const arrayLiteralMatch = projectsRaw.match(/window\.NIRMAN_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
if (!arrayLiteralMatch) throw new Error('Could not parse NIRMAN_PROJECTS.');
const projects = new Function('return ' + arrayLiteralMatch[1])();

// Use the most recent commit time of projects.js as the feed-level "updated"
// stamp. Falls back to now if stat fails.
let feedUpdated = new Date().toISOString();
try {
  const s = await stat(join(root, 'data/projects.js'));
  feedUpdated = new Date(s.mtime).toISOString();
} catch (_) {}

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const entries = projects.map(p => {
  const url = SITE + 'projects/' + p.id + '/';
  const completed = p.status === 'completed';
  const statusText = completed ? 'Completed' : (p.delayed ? 'Active · behind schedule' : 'Active · on track');
  const summary = `${p.category} · ${p.districtLabel} · ${statusText} · ${p.progress}% complete · ₹${p.budget.toLocaleString('en-IN')} Cr outlay. ${p.desc || ''}`;
  return `  <entry>
    <id>${url}</id>
    <title type="text">${esc(p.name)}</title>
    <link rel="alternate" type="text/html" href="${url}"/>
    <updated>${feedUpdated}</updated>
    <category term="${esc(p.category)}"/>
    <category term="${esc(p.districtLabel)}"/>
    <category term="${p.level || 'center'}"/>
    <summary type="text">${esc(summary.slice(0, 600))}</summary>
  </entry>`;
}).join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <id>${SITE}feed.xml</id>
  <title>Nirman Darpan — Himachal Pradesh public works</title>
  <subtitle>Independent civic-transparency tracker. Status, budgets, accountability records and press coverage for ${projects.length} public-works projects across all 12 HP districts.</subtitle>
  <link rel="self" type="application/atom+xml" href="${SITE}feed.xml"/>
  <link rel="alternate" type="text/html" href="${SITE}"/>
  <updated>${feedUpdated}</updated>
  <generator uri="${SITE}">Nirman Darpan</generator>
  <icon>${SITE}favicon.ico</icon>
${entries}
</feed>
`;

await writeFile(join(root, 'feed.xml'), feed, 'utf8');
console.log(`feed.xml regenerated with ${projects.length} entries (updated ${feedUpdated}).`);
