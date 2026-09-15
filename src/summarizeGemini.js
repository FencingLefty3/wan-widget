import { config } from './config.js';

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

export async function summarize(transcript, videoTitle) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT(transcript, videoTitle) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text);
  if (!parsed.headline || !parsed.paragraph) {
    throw new Error('Gemini response missing headline or paragraph');
  }
  return parsed;
}
