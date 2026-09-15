// Run once, write docs/latest.png + docs/latest.json + docs/index.html, then exit.
// Used by .github/workflows/wan-show.yml — GitHub Pages serves the docs/ folder.
import { runPipelineIfNewEpisode } from '../src/pipeline.js';
import { loadState } from '../src/state.js';
import { renderIndexHtml } from '../src/renderHtml.js';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../src/config.js';

let state = null;
try {
  state = await runPipelineIfNewEpisode();
} catch (err) {
  // Transient failures (feed hiccup, captions not ready yet, API rate limit)
  // shouldn't nuke the site — fall back to whatever was last published.
  console.error('[generate] Pipeline run failed, keeping previous state:', err);
}
const finalState = state ?? (await loadState());

const dir = path.dirname(config.dataFile);
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, 'index.html'), renderIndexHtml(finalState));
// GitHub Pages runs content through Jekyll by default, which ignores files
// starting with _ and can mangle others — this opts out entirely.
await fs.writeFile(path.join(dir, '.nojekyll'), '');

if (!finalState) {
  console.log('[generate] No episode processed yet, nothing to publish.');
} else {
  console.log(`[generate] Published: ${finalState.headline}`);
}
