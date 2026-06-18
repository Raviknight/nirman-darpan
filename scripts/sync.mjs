// scripts/sync.mjs — scheduled refresh job.
//
// Today: rewrites data/meta.json with a fresh ISO timestamp so the "Auto-synced"
// badge on the site is honest about the last verified pass.
//
// Designed so the next pass can plug in real source fetches without changing the
// workflow file: read data/sources.md, fetch each surface, write structured output
// into data/news.json (a "pending review" queue per docs/HANDOFF.md), and never
// auto-mutate data/projects.js — humans approve project changes via PR.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const now = new Date();
const meta = {
  synced_at: now.toISOString(),
  source_catalogue: 'data/sources.md',
  note: 'Updated automatically by .github/workflows/sync.yml on Mon & Thu. Manual edits are fine — the next run overwrites synced_at.',
};

await writeFile(
  resolve(root, 'data/meta.json'),
  JSON.stringify(meta, null, 2) + '\n',
  'utf8',
);

console.log(`meta updated · ${now.toISOString()}`);
