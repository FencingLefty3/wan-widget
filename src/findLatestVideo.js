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
  const res = await fetch(FEED_URL(config.channelId), {
    headers: {
      // Some automated/datacenter requests get served a stripped or
      // empty response without a browser-like UA — this avoids that.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'application/atom+xml,application/xml,text/xml',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch channel feed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();

  if (!xml.includes('<feed')) {
    // We got a 200 but not an Atom feed — likely a consent/interstitial
    // page rather than the actual feed. Surface enough to diagnose it
    // instead of silently reporting "no episode found".
    throw new Error(
      `Response doesn't look like an Atom feed (got ${xml.length} chars, starts with: ${xml.slice(0, 200).replace(/\s+/g, ' ')})`
    );
  }

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const feed = parser.parse(xml);

  const entries = feed?.feed?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];

  console.log(
    `[findLatestVideo] Parsed ${list.length} feed entries: ${list
      .map((e) => JSON.stringify(e.title))
      .join(', ')}`
  );

  const wanShow = list.find((e) => /wan show/i.test(e.title ?? ''));
  if (!wanShow) return null;

  return {
    videoId: wanShow['yt:videoId'],
    title: wanShow.title,
    publishedAt: wanShow.published,
    url: `https://www.youtube.com/watch?v=${wanShow['yt:videoId']}`,
  };
}
