// scripts/youtube_sweep.mjs — fetch top videos + comments per project.
// Runs in the sync workflow after social_sync. Free daily quota is 10 K units;
// this script uses ~35–100 units per project (search=100 + comment threads=1 each),
// so twice a week for 32 projects sits at ~6,600 units per week — comfortable.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) {
  console.log('[youtube] YOUTUBE_API_KEY not set — skipping YouTube sweep.');
  process.exit(0);
}

const projectsRaw = await readFile(join(root, 'data/projects.js'), 'utf8');
const arrayLiteralMatch = projectsRaw.match(/window\.NIRMAN_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);
if (!arrayLiteralMatch) throw new Error('Could not parse NIRMAN_PROJECTS.');
const projects = new Function('return ' + arrayLiteralMatch[1])();

const outDir = join(root, 'data/youtube');
await mkdir(outDir, { recursive: true });

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} · ${url.slice(0, 120)}`);
  return r.json();
}

async function searchVideos(query) {
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('q', query);
  u.searchParams.set('type', 'video');
  u.searchParams.set('maxResults', '5');
  u.searchParams.set('order', 'relevance');
  u.searchParams.set('regionCode', 'IN');
  u.searchParams.set('key', KEY);
  const j = await fetchJSON(u.href);
  return (j.items || []).map(it => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channel: it.snippet.channelTitle,
    published_at: it.snippet.publishedAt,
    description: (it.snippet.description || '').slice(0, 400),
  })).filter(v => v.videoId);
}

async function fetchComments(videoId) {
  const u = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('videoId', videoId);
  u.searchParams.set('maxResults', '20');
  u.searchParams.set('order', 'relevance');
  u.searchParams.set('textFormat', 'plainText');
  u.searchParams.set('key', KEY);
  try {
    const j = await fetchJSON(u.href);
    return (j.items || []).map(it => {
      const t = it.snippet.topLevelComment.snippet;
      return {
        comment_id: it.id,
        author: t.authorDisplayName,
        text: (t.textDisplay || '').slice(0, 1500),
        like_count: t.likeCount || 0,
        published_at: t.publishedAt,
      };
    });
  } catch (e) {
    // Video may have comments disabled; not fatal.
    return [];
  }
}

let totalVideos = 0, totalComments = 0;

for (const p of projects) {
  // One well-formed search per project. Combine name + Himachal for specificity.
  const q = `"${p.name.split('(')[0].trim()}" Himachal`;
  let videos = [];
  try { videos = await searchVideos(q); }
  catch (e) { console.log(`[youtube] search ${p.id}: FAIL ${e.message}`); }

  const videoRecords = [];
  for (const v of videos.slice(0, 3)) {
    const comments = await fetchComments(v.videoId);
    videoRecords.push({ ...v, comment_count: comments.length, comments });
    totalComments += comments.length;
  }
  totalVideos += videoRecords.length;

  const payload = {
    updated_at: new Date().toISOString(),
    project_id: p.id,
    query: q,
    counts: { videos: videoRecords.length, comments: videoRecords.reduce((a, v) => a + v.comment_count, 0) },
    videos: videoRecords,
    methodology: 'YouTube Data API v3 search for the project name (India region). Top 3 videos by relevance; top 20 comments per video.',
  };
  await writeFile(join(outDir, p.id + '.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  if (videoRecords.length) console.log(`[youtube] ${p.id.padEnd(20)} ${videoRecords.length} videos · ${payload.counts.comments} comments`);
}

console.log(`[youtube] Done. ${totalVideos} videos, ${totalComments} comments across ${projects.length} projects.`);
