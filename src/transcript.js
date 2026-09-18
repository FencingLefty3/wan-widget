import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

async function runOnce(videoId) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wan-transcript-'));
  const outputTemplate = path.join(tmpDir, '%(id)s');
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  let cookiesFile = null;
  if (process.env.YT_COOKIES) {
    cookiesFile = path.join(tmpDir, 'cookies.txt');
    await fs.writeFile(cookiesFile, process.env.YT_COOKIES, 'utf-8');
  }

  try {
    const { stdout, stderr } = await execFileAsync(
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
        `yt-dlp ran but produced no subtitle file.\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`
      );
    }

    const vtt = await fs.readFile(path.join(tmpDir, vttFile), 'utf-8');
    return vttToText(vtt);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getTranscript(videoId, { retries = 1, retryDelayMs = 15000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await runOnce(videoId);
    } catch (err) {
      lastErr = err;
      console.error(`[transcript] Attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }
  throw lastErr;
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