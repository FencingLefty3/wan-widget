import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

// Uses yt-dlp (must be on PATH — see README) instead of an npm scraping
// library. Unofficial JS libraries like `youtube-transcript` are
// frequently blocked/misdetected from cloud CI IP ranges (GitHub Actions
// included), which surfaces as a misleading "captions disabled" error
// even when the video genuinely has auto-captions. yt-dlp is far better
// maintained against that kind of anti-bot friction.
export async function getTranscript(videoId) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wan-transcript-'));
  const outputTemplate = path.join(tmpDir, '%(id)s');
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    await execFileAsync(
      'yt-dlp',
      [
        '--write-auto-subs',
        '--skip-download',
        '--sub-langs',
        'en.*',
        '--sub-format',
        'vtt',
        '-o',
        outputTemplate,
        url,
      ],
      { maxBuffer: 1024 * 1024 * 20 }
    );

    const files = await fs.readdir(tmpDir);
    const vttFile = files.find((f) => f.endsWith('.vtt'));
    if (!vttFile) {
      throw new Error(
        'yt-dlp ran but produced no subtitle file — captions may not be processed yet for this video, or auto-captions are unavailable.'
      );
    }

    const vtt = await fs.readFile(path.join(tmpDir, vttFile), 'utf-8');
    return vttToText(vtt);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

// Auto-generated YouTube captions are "rolling" — each cue repeats part
// of the previous line as new words scroll in. Skipping consecutive
// duplicate lines collapses that into clean, non-repeating text.
function vttToText(vtt) {
  const lines = vtt.split('\n');
  const out = [];
  let lastLine = '';
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('WEBVTT')) continue;
    if (trimmed.startsWith('Kind:') || trimmed.startsWith('Language:')) continue;
    if (/^\d+$/.test(trimmed)) continue; // cue number
    if (/-->/.test(trimmed)) continue; // timestamp line
    const clean = trimmed.replace(/<[^>]+>/g, '').trim(); // strip <00:00:01.234><c> tags
    if (!clean || clean === lastLine) continue;
    out.push(clean);
    lastLine = clean;
  }
  return out.join(' ');
}