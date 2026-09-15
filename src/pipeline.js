import { findLatestWanShow } from './findLatestVideo.js';
import { getTranscript } from './transcript.js';
import { summarize } from './summarize.js';
import { generateWallpaper } from './image.js';
import { loadState, saveState } from './state.js';

export async function runPipelineIfNewEpisode() {
  const latest = await findLatestWanShow();
  if (!latest) {
    console.log('[pipeline] No WAN Show episode found in feed.');
    return null;
  }

  const prev = await loadState();
  if (prev?.videoId === latest.videoId) {
    console.log(`[pipeline] Already processed ${latest.videoId}, skipping.`);
    return prev;
  }

  console.log(`[pipeline] New episode found: ${latest.title} (${latest.videoId})`);
  const transcript = await getTranscript(latest.videoId);
  console.log(`[pipeline] Transcript fetched: ${transcript.length} chars`);

  const { headline, paragraph } = await summarize(transcript, latest.title);
  console.log(`[pipeline] Summary: ${headline}`);

  const dateLabel = new Date(latest.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const imageBuffer = await generateWallpaper({ headline, dateLabel });

  const state = {
    videoId: latest.videoId,
    videoTitle: latest.title,
    videoUrl: latest.url,
    publishedAt: latest.publishedAt,
    headline,
    paragraph,
    processedAt: new Date().toISOString(),
  };
  await saveState(state, imageBuffer);
  console.log('[pipeline] Saved new state and image.');
  return state;
}
