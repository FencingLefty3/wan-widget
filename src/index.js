import express from 'express';
import cron from 'node-cron';
import { config } from './config.js';
import { runPipelineIfNewEpisode } from './pipeline.js';
import { loadState, imageFile } from './state.js';
import { renderIndexHtml } from './renderHtml.js';
import { promises as fs } from 'fs';

const app = express();

app.get('/latest.json', async (req, res) => {
  const state = await loadState();
  if (!state) return res.status(404).json({ error: 'No episode processed yet' });
  res.json(state);
});

app.get('/latest.png', async (req, res) => {
  try {
    const buf = await fs.readFile(imageFile);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buf);
  } catch {
    res.status(404).send('No image yet');
  }
});

app.get('/', async (req, res) => {
  const state = await loadState();
  res.send(renderIndexHtml(state));
});

// Manual trigger, handy for testing / forcing a re-run from a Railway shell or curl.
app.post('/run', async (req, res) => {
  try {
    const state = await runPipelineIfNewEpisode();
    res.json({ ok: true, state });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(config.port, () => {
  console.log(`[server] Listening on port ${config.port}`);
});

// Check on boot, then on the configured cron schedule.
runPipelineIfNewEpisode().catch((err) => console.error('[pipeline:boot]', err));
cron.schedule(config.cronSchedule, () => {
  runPipelineIfNewEpisode().catch((err) => console.error('[pipeline:cron]', err));
});
