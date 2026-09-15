import sharp from 'sharp';
import { config } from './config.js';

// A handful of pleasant gradient pairs to rotate through so consecutive
// weeks don't look identical. Picked deterministically from the headline
// so the same episode always renders the same image.
const PALETTES = [
  ['#0f2027', '#2c5364'],
  ['#3a1c71', '#d76d77'],
  ['#134e5e', '#71b280'],
  ['#ff512f', '#dd2476'],
  ['#141e30', '#243b55'],
  ['#5f2c82', '#49a09d'],
  ['#232526', '#414345'],
  ['#1a2980', '#26d0ce'],
];

function pickPalette(seed) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[hash % PALETTES.length];
}

// Very small manual word-wrap since SVG <text> doesn't wrap on its own.
function wrapLines(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function generateWallpaper({ headline, dateLabel }) {
  const { imageWidth: W, imageHeight: H } = config;
  const [from, to] = pickPalette(headline);

  const lines = wrapLines(headline.toUpperCase(), 14);
  const fontSize = 108;
  const lineHeight = fontSize * 1.15;
  const textBlockHeight = lines.length * lineHeight;
  // Anchor the headline roughly in the lower third, clear of the lock-screen clock.
  const startY = H * 0.62 - textBlockHeight / 2;

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${W / 2}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="${W / 2}" y="${startY - fontSize * 0.9}" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="600"
        fill="#ffffff" fill-opacity="0.75" letter-spacing="6">WAN SHOW${dateLabel ? ' · ' + escapeXml(dateLabel) : ''}</text>
  <text filter="url(#shadow)" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="#ffffff">
    ${tspans}
  </text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
