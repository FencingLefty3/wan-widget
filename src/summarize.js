import { config } from './config.js';
import { summarize as summarizeOpenRouter } from './summarizeOpenRouter.js';
import { summarize as summarizeGroq } from './summarizeGroq.js';
import { summarize as summarizeGemini } from './summarizeGemini.js';

// GitHub Models was fully retired by GitHub on July 30, 2026 — it's gone
// permanently, so it's no longer an option (summarizeGitHubModels.js is
// unused, kept only for reference). OpenRouter (Nemotron's huge context
// window, no chunking needed) is the default; Groq and Gemini remain as
// automatic fallbacks if OPENROUTER_API_KEY isn't set.
export async function summarize(transcript, videoTitle) {
  if (config.openrouterApiKey) return summarizeOpenRouter(transcript, videoTitle);
  if (config.groqApiKey) return summarizeGroq(transcript, videoTitle);
  if (config.geminiApiKey) return summarizeGemini(transcript, videoTitle);
  throw new Error('Set OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY');
}