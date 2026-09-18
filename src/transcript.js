import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

export async function getTranscript(videoId) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wan-transcript-'));
  const outputTemplate = path.join(tmpDir, '%(id)s');
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  let cookiesFile = null;
  if (process.env.YT_COOKIES) {
    cookiesFile = path.join(tmpDir, 'cookies.txt');
    await fs.writeFile(cookiesFile, process.env.YT_COOKIES, 'utf-8');
  }

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
        ...(cookiesFile ? ['--cookies', cookiesFile] : []),
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

function vttToText(vtt) {
  const lines = vtt.split('\n');
  const out = [];
  let lastLine = '';
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('WEBVTT')) continue;
    if (trimmed.startsWith('Kind:') || trimmed.startsWith('Language:')) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/-->/.test(trimmed)) continue;
    const clean = trimmed.replace(/<[^>]+>/g, '').trim();
    if (!clean || clean === lastLine) continue;
    out.push(clean);
    lastLine = clean;
  }
  return out.join(' ');
}