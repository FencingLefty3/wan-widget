import { config } from './config.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function groqChat(messages, { jsonMode = false } = {}) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned no text');
  return text;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Splits on paragraph/sentence-ish boundaries so we don't cut mid-word,
// aiming for chunks around config.groqChunkChars characters.
function chunkTranscript(transcript, maxChars) {
  const chunks = [];
  let start = 0;
  while (start < transcript.length) {
    let end = Math.min(start + maxChars, transcript.length);
    if (end < transcript.length) {
      const lastSpace = transcript.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(transcript.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

async function summarizeChunk(chunk, index, total) {
  const messages = [
    {
      role: 'system',
      content:
        'You summarize a slice of a tech podcast transcript into terse factual notes for later synthesis. Not a recap of "they discussed X" — extract concrete facts, names, numbers, and opinions stated.',
    },
    {
      role: 'user',
      content: `This is part ${index + 1} of ${total} of a WAN Show transcript. Extract the most important factual points as a short bullet list (3-6 bullets, each under 20 words). Plain text bullets, one per line, no markdown asterisks needed beyond a leading "-".\n\n"""${chunk}"""`,
    },
  ];
  return groqChat(messages);
}

async function reduceNotes(notesList, videoTitle) {
  const combined = notesList.map((n, i) => `Part ${i + 1} notes:\n${n}`).join('\n\n');
  const messages = [
    {
      role: 'system',
      content:
        'You write concise, factual tech-news briefs from a set of partial notes covering one podcast episode, in strict JSON.',
    },
    {
      role: 'user',
      content: `Episode title: "${videoTitle}"

Here are notes extracted from consecutive parts of the WAN Show transcript:

${combined}

Produce:
1. "headline": A punchy, specific headline for the single most important or interesting story. Max 6 words. No quotes, no trailing punctuation.
2. "paragraph": A dense, informative paragraph (4-6 sentences) covering the most important news, announcements, and opinions from across all the notes. Lead with facts, like a news brief.

Respond with ONLY minified JSON, no markdown fences, no commentary:
{"headline":"...","paragraph":"..."}`,
    },
  ];
  const text = await groqChat(messages, { jsonMode: true });
  const parsed = JSON.parse(text);
  if (!parsed.headline || !parsed.paragraph) {
    throw new Error('Groq reduce step missing headline or paragraph');
  }
  return parsed;
}

export async function summarize(transcript, videoTitle) {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const chunks = chunkTranscript(transcript, config.groqChunkChars);
  console.log(`[summarize] ${chunks.length} chunk(s) to process`);

  const notes = [];
  for (let i = 0; i < chunks.length; i++) {
    notes.push(await summarizeChunk(chunks[i], i, chunks.length));
    // Pace requests to stay under the free-tier tokens/minute cap. No need
    // to wait after the last chunk.
    if (i < chunks.length - 1) await sleep(config.groqPaceMs);
  }

  if (notes.length > 1) await sleep(config.groqPaceMs);
  return reduceNotes(notes, videoTitle);
}
