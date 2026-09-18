import { config } from './config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PROMPT = (transcript, videoTitle) => `You are given the auto-generated transcript of the latest LTT WAN Show podcast episode, titled "${videoTitle}".

Read it and produce:
1. "headline": A punchy, specific headline capturing the single most important or interesting story discussed. Max 6 words. No quotation marks, no trailing punctuation.
2. "paragraph": A dense, informative paragraph (4-6 sentences) covering the most important news, announcements, and opinions discussed in the episode. Write it like a tech news brief, not a recap of "what they talked about" — lead with facts.

Respond with ONLY minified JSON in this exact shape, no markdown fences, no commentary:
{"headline":"...","paragraph":"..."}

Transcript:
"""
${transcript}
"""`;

// Nemotron's huge context window means the whole transcript fits in one
// request — no chunked map-reduce needed, unlike the Groq/GitHub Models
// versions. OpenRouter's free tier is request-count limited (not
// tokens/minute), and this only runs once per new episode, so a single
// large call is fine.
export async function summarize(transcript, videoTitle) {
  if (!config.openrouterApiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openrouterApiKey}`,
      // Optional but recommended by OpenRouter for their own analytics —
      // harmless to leave as-is.
      'HTTP-Referer': 'https://github.com/',
      'X-Title': 'WAN Show Wallpaper',
    },
    body: JSON.stringify({
      model: config.openrouterModel,
      messages: [{ role: 'user', content: PROMPT(transcript, videoTitle) }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter returned no text');

  const parsed = JSON.parse(text);
  if (!parsed.headline || !parsed.paragraph) {
    throw new Error('OpenRouter response missing headline or paragraph');
  }
  return parsed;
}