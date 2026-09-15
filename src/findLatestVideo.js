import { config } from './config.js';

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

/**
 * Uses the YouTube Data API's search endpoint to find the most recent
 * video on the channel matching "WAN Show". Unlike the RSS feed (capped
 * at the 15 most recent uploads with no way to page further back), this
 * searches the whole channel, so a weekly episode won't get lost behind
 * a burst of unrelated uploads.
 */
export async function findLatestWanShow() {
  if (!config.youtubeApiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }

  const params = new URLSearchParams({
    key: config.youtubeApiKey,
    channelId: config.channelId,
    q: 'WAN Show',
    type: 'video',
    order: 'date',
    maxResults: '5',
    part: 'snippet',
  });

  const res = await fetch(`${SEARCH_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube Data API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const items = data.items ?? [];
  console.log(
    `[findLatestVideo] Search returned ${items.length} result(s): ${items
      .map((it) => JSON.stringify(it.snippet?.title))
      .join(', ')}`
  );

  // Belt-and-suspenders: the API's `q` param is a general text match, not
  // an exact title filter, so double-check "WAN Show" is actually in the
  // title before trusting the top result.
  const wanShow = items.find((it) => /wan show/i.test(it.snippet?.title ?? ''));
  if (!wanShow) return null;

  const videoId = wanShow.id?.videoId;
  return {
    videoId,
    title: wanShow.snippet.title,
    publishedAt: wanShow.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}