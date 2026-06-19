// scripts/gen_sitemap.mjs — regenerate sitemap.xml from data/projects.js.
// Runs in the scheduled workflow so the sitemap stays in sync as projects
// are added/removed without a separate commit.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const ids = [...projectsRaw.matchAll(/id:'([A-Z0-9-]+)'/g)].map(m => m[1]);
const today = new Date().toISOString().slice(0, 10);
const base = 'https://raviknight.github.io/nirman-darpan/';

const editorialPages = ['about/', 'methodology/', 'corrections/', 'privacy/', 'funding/', 'code-of-conduct/'];
const districts = ['Bilaspur','Chamba','Hamirpur','Kangra','Kinnaur','Kullu','Lahaul-Spiti','Mandi','Shimla','Sirmaur','Solan','Una'];

const lines = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <url><loc>${base}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  `  <url><loc>${base}projects/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`];
// Per-project canonical URL is /projects/<id>/ (static HTML, indexable).
for (const id of ids) {
  lines.push(`  <url><loc>${base}projects/${id}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
}
lines.push(`  <url><loc>${base}districts/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
for (const d of districts) {
  lines.push(`  <url><loc>${base}districts/${encodeURIComponent(d)}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
}
for (const slug of editorialPages) {
  lines.push(`  <url><loc>${base}${slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`);
}
lines.push('</urlset>', '');

await writeFile(join(root, 'sitemap.xml'), lines.join('\n'), 'utf8');
console.log(`sitemap.xml regenerated with ${ids.length + 1} URLs.`);
