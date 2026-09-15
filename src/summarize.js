import { config } from './config.js';
import { summarize as summarizeGitHubModels } from './summarizeGitHubModels.js';
import { summarize as summarizeGroq } from './summarizeGroq.js';
import { summarize as summarizeGemini } from './summarizeGemini.js';

// Prefers GitHub Models (free, zero-setup inside GitHub Actions via the
// built-in GITHUB_TOKEN), then Groq (free, no age-verification gate),
// then Gemini (needs an age-verified Google account).
export async function summarize(transcript, videoTitle) {
  if (config.githubModelsToken) return summarizeGitHubModels(transcript, videoTitle);
  if (config.groqApiKey) return summarizeGroq(transcript, videoTitle);
  if (config.geminiApiKey) return summarizeGemini(transcript, videoTitle);
  throw new Error(
    'Set GITHUB_MODELS_TOKEN (auto-set as GITHUB_TOKEN in Actions), GROQ_API_KEY, or GEMINI_API_KEY'
  );
}
