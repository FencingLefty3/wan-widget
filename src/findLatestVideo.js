import { XMLParser } from 'fast-xml-parser';
import { config } from './config.js';

// Free RSS feed, no API key needed. This assumes config.channelId points
// at a channel where every upload IS a WAN Show episode (e.g. a
// dedicated WAN Show channel) — so we just take the newest entry rather
// than filtering by title. If you ever point this at a mixed channel
// (like the main LTT channel) again, you'll want the YouTube Data API
// version instead, since RSS only returns the 15 most recent uploads
// with no way to page further back, and a title filter can miss an
// episode buried behind unrelated content.

const FEED_URL = (channelId) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

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

  const latest = list[0];
  if (!latest) return null;

  return {
    videoId: latest['yt:videoId'],
    title: latest.title,
    publishedAt: latest.published,
    url: `https://www.youtube.com/watch?v=${latest['yt:videoId']}`,
  };
}