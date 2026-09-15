import 'dotenv/config';

export const config = {
  // Linus Tech Tips main channel (WAN Show is uploaded here). Verify this
  // is still correct at https://www.youtube.com/@LinusTechTips before relying on it.
  channelId: process.env.YT_CHANNEL_ID || 'UCXuqSBlHAE6Xw-yeJA0Tunw',
  geminiApiKey: process.env.GEMINI_API_KEY,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  // Groq's free tier caps throughput around 12k tokens/minute, so long
  // transcripts get chunked. Keep chunks well under that so each call
  // (chunk + prompt + response) has headroom.
  groqChunkChars: Number(process.env.GROQ_CHUNK_CHARS || 9000),
  // Milliseconds to wait between chunk calls to stay under the per-minute
  // token cap. 20s -> max 3 calls/min.
  groqPaceMs: Number(process.env.GROQ_PACE_MS || 20000),
  // GitHub Models: free, and inside a GitHub Action the built-in
  // GITHUB_TOKEN works with zero extra signup. Outside Actions (e.g. the
  // Railway/Express deploy), set GITHUB_MODELS_TOKEN explicitly to a PAT
  // with the `models: read` scope — GITHUB_TOKEN is only auto-used when
  // GITHUB_ACTIONS is set, so an unrelated GITHUB_TOKEN in your shell
  // (e.g. from the gh CLI) won't silently get used here.
  githubModelsToken:
    process.env.GITHUB_MODELS_TOKEN ||
    (process.env.GITHUB_ACTIONS === 'true' ? process.env.GITHUB_TOKEN : undefined),
  githubModel: process.env.GITHUB_MODEL || 'openai/gpt-4o-mini',
  githubModelsChunkChars: Number(process.env.GITHUB_MODELS_CHUNK_CHARS || 9000),
  // Free tier is roughly 15 requests/min on low-tier models like
  // gpt-4o-mini — pace conservatively since exact limits vary and aren't
  // published per-account.
  githubModelsPaceMs: Number(process.env.GITHUB_MODELS_PACE_MS || 5000),
  // How often to check for a new upload. Default: every 3 hours.
  cronSchedule: process.env.CRON_SCHEDULE || '0 */3 * * *',
  port: process.env.PORT || 3000,
  imageWidth: 1290,
  imageHeight: 2796, // iPhone 15/16 Pro point resolution; adjust for your model
  dataFile: process.env.DATA_FILE || './data/latest.json',
};
