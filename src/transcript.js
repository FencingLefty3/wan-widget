import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Returns the full transcript text for a video, or throws if captions
 * aren't available (e.g. WAN Show VODs sometimes take a few hours after
 * upload for auto-captions to finish processing — the cron will just
 * retry on the next run).
 */
export async function getTranscript(videoId) {
  const parts = await YoutubeTranscript.fetchTranscript(videoId);
  return parts.map((p) => p.text).join(' ');
}
