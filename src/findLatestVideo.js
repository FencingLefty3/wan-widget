import { XMLParser } from 'fast-xml-parser';
import { config } from './config.js';

const FEED_URL = (channelId) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

/**
 * Fetches the channel's upload feed and returns the most recent entry
 * whose title looks like a WAN Show episode. Returns null if none found
 * or the feed can't be parsed.
 */
export async function findLatestWanShow() {
  const res = await fetch(FEED_URL(config.channelId));
  if (!res.ok) {
    throw new Error(`Failed to fetch channel feed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const feed = parser.parse(xml);

  const entries = feed?.feed?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];

  const wanShow = list.find((e) => /wan show/i.test(e.title ?? ''));
  if (!wanShow) return null;

  return {
    videoId: wanShow['yt:videoId'],
    title: wanShow.title,
    publishedAt: wanShow.published,
    url: `https://www.youtube.com/watch?v=${wanShow['yt:videoId']}`,
  };
}
