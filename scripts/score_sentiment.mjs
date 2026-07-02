// scripts/score_sentiment.mjs — score sentiment on press headlines + YouTube
// comments using Google Cloud Natural Language API's analyzeSentiment endpoint.
// Free tier: first 5,000 1K-char units / month. Our volume: well under.
//
// Output per project: data/sentiment/<id>.json with aggregated scores by
// source and a rolling sample of high/low items for the Editorial Queue.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const KEY = process.env.GOOGLE_NLP_API_KEY;
if (!KEY) {
  console.log('[sentiment] GOOGLE_NLP_API_KEY not set — skipping.');
  process.exit(0);
}

const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const arrayLiteralMatch = projectsRaw.match(/window\.NIRMAN_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
if (!arrayLiteralMatch) throw new Error('Could not parse NIRMAN_PROJECTS.');
const projects = new Function('return ' + arrayLiteralMatch[1])();

const outDir = join(root, 'data/sentiment');
await mkdir(outDir, { recursive: true });

// Load cache of previously scored items (URL / comment_id → { score, magnitude })
// so we only spend API quota on genuinely new content.
const cachePath = join(outDir, '_cache.json');
let cache = {};
try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch (_) {}

let apiCalls = 0, cacheHits = 0;

async function score(text, language) {
  if (!text || text.trim().length < 3) return null;
  const body = {
    document: { type: 'PLAIN_TEXT', content: text.slice(0, 8000), language: language || 'en' },
    encodingType: 'UTF8',
  };
  try {
    const r = await fetch(`https://language.googleapis.com/v1/documents:analyzeSentiment?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errText = await r.text();
      // If the language auto-detect is the issue, retry without language hint.
      if (r.status === 400 && language) {
        return score(text, null);
      }
      console.log(`[sentiment] HTTP ${r.status}: ${errText.slice(0, 200)}`);
      return null;
    }
    const j = await r.json();
    apiCalls++;
    return {
      score: j.documentSentiment?.score ?? 0,
      magnitude: j.documentSentiment?.magnitude ?? 0,
    };
  } catch (e) {
    console.log('[sentiment] fetch error:', e.message);
    return null;
  }
}

async function scoreCached(key, text, language) {
  if (cache[key]) { cacheHits++; return cache[key]; }
  const res = await score(text, language);
  if (res) cache[key] = res;
  return res;
}

// Classify score into { positive | neutral | concern }.
// score range: -1 to +1. magnitude: 0 to inf. Threshold ≥ 0.15 abs.
function classify(s) {
  if (!s) return 'neutral';
  if (s.score >= 0.15) return 'positive';
  if (s.score <= -0.15) return 'concern';
  return 'neutral';
}

function aggregate(items) {
  const buckets = { positive: 0, neutral: 0, concern: 0 };
  let scoreSum = 0, magSum = 0, n = 0;
  for (const it of items) {
    if (!it.sentiment) continue;
    buckets[classify(it.sentiment)]++;
    scoreSum += it.sentiment.score;
    magSum += it.sentiment.magnitude;
    n++;
  }
  return {
    n,
    positive: buckets.positive,
    neutral: buckets.neutral,
    concern: buckets.concern,
    avg_score: n ? +(scoreSum / n).toFixed(3) : 0,
    avg_magnitude: n ? +(magSum / n).toFixed(3) : 0,
  };
}

for (const p of projects) {
  // Press headlines/snippets
  let press = [];
  try {
    const social = JSON.parse(await readFile(join(root, 'data/social', p.id + '.json'), 'utf8'));
    for (const m of (social.mentions || []).slice(0, 20)) {
      const s = await scoreCached('press:' + m.url, m.title, m.lang);
      press.push({ url: m.url, title: m.title, source: m.source, lang: m.lang, date: m.date, sentiment: s });
    }
  } catch (_) {}

  // YouTube comments
  let youtube = [];
  try {
    const yt = JSON.parse(await readFile(join(root, 'data/youtube', p.id + '.json'), 'utf8'));
    for (const v of (yt.videos || [])) {
      for (const c of (v.comments || [])) {
        const s = await scoreCached('yt:' + c.comment_id, c.text, null);
        youtube.push({
          comment_id: c.comment_id, video_id: v.videoId, video_title: v.title,
          author: c.author, text: c.text.slice(0, 300), like_count: c.like_count,
          date: c.published_at, sentiment: s,
        });
      }
    }
  } catch (_) {}

  const pressAgg = aggregate(press);
  const ytAgg = aggregate(youtube);
  const combinedItems = [...press, ...youtube];
  const overallAgg = aggregate(combinedItems);

  // High + low examples for editor context (top 3 each)
  const sorted = combinedItems.filter(i => i.sentiment).sort((a, b) => b.sentiment.score - a.sentiment.score);
  const top_positive = sorted.slice(0, 3).map(i => ({ source: i.url ? 'press' : 'youtube', title: i.title || i.text?.slice(0,120), url: i.url, score: i.sentiment.score }));
  const top_concern = sorted.slice(-3).reverse().map(i => ({ source: i.url ? 'press' : 'youtube', title: i.title || i.text?.slice(0,120), url: i.url, score: i.sentiment.score }));

  const payload = {
    updated_at: new Date().toISOString(),
    project_id: p.id,
    press: pressAgg,
    youtube: ytAgg,
    overall: overallAgg,
    top_positive,
    top_concern,
    methodology: 'Cloud Natural Language API analyzeSentiment on press headlines and YouTube comments. Score in [-1, 1]; magnitude ≥ 0. Editor reviews before any of this is surfaced on the public site.',
  };
  await writeFile(join(outDir, p.id + '.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  if (overallAgg.n) console.log(`[sentiment] ${p.id.padEnd(20)} n=${overallAgg.n} avg=${overallAgg.avg_score}`);
}

// Persist the cache so subsequent runs don't re-score items we already know.
// Trim to last ~5000 entries to bound file size.
const cacheKeys = Object.keys(cache);
if (cacheKeys.length > 5000) {
  const trimmed = {};
  for (const k of cacheKeys.slice(-5000)) trimmed[k] = cache[k];
  cache = trimmed;
}
await writeFile(cachePath, JSON.stringify(cache, null, 2) + '\n', 'utf8');

console.log(`[sentiment] Done. ${apiCalls} API calls · ${cacheHits} cache hits.`);
