# WAN Show Wallpaper

Checks for new LTT WAN Show episodes, summarizes the transcript with Gemini,
and renders an iPhone-sized gradient wallpaper with the headline.

## Endpoints

- `GET /` — HTML page with the wallpaper, headline, and summary paragraph
- `GET /latest.png` — just the wallpaper image (use this in an iOS Shortcut)
- `GET /latest.json` — `{ headline, paragraph, videoTitle, videoUrl, publishedAt }`
- `POST /run` — manually trigger a check/run (useful for testing)

## How it works

1. Every few hours (see `CRON_SCHEDULE`), it reads LTT's public YouTube RSS
   feed (no API key needed) looking for a title containing "WAN Show".
2. If it's a new video ID it hasn't processed before, it pulls the
   auto-captions via the `youtube-transcript` package.
3. The transcript is sent to Gemini with a prompt asking for a short
   headline + a summary paragraph, returned as JSON.
4. `sharp` renders an SVG gradient + the headline as a PNG sized for an
   iPhone screen, and everything is saved to `./data`.

## Local setup

```bash
npm install
cp .env.example .env
# add your free Gemini key from https://aistudio.google.com/apikey to .env
npm start
```

Visit `http://localhost:3000` — on first boot it'll try to fetch and process
the latest episode immediately (also runs on the cron schedule after that).

You can force a re-run any time with:

```bash
curl -X POST http://localhost:3000/run
```

## Deploying to Railway

1. Push this folder to a GitHub repo.
2. In Railway: **New Project → Deploy from GitHub repo**, pick the repo.
3. Railway auto-detects Node via Nixpacks — no config needed.
4. In the service's **Variables** tab, add `GEMINI_API_KEY` (and optionally
   `CRON_SCHEDULE`, `YT_CHANNEL_ID`).
5. Railway assigns a public domain under **Settings → Networking → Generate
   Domain**. That's your base URL for `/latest.png` etc.
6. **Note on cost**: Railway's free offering is now a 30-day, $5-credit
   trial — after that you're on the $5/mo Hobby plan. This service is tiny
   (idle most of the time, briefly spikes during the cron run) so it should
   stay well within the Hobby plan's included usage, but it isn't free
   forever.
7. **Note on storage**: Railway's filesystem is ephemeral by default — a
   redeploy or restart wipes `./data`. That's harmless here (it'll just
   reprocess the current episode on next boot), but if you want the
   processed history to survive restarts, attach a Railway Volume mounted
   at `/app/data` and set `DATA_FILE=/app/data/latest.json`.

## iOS Shortcut idea

Create a Shortcut that runs on a schedule (Automation → Time of Day):
"Get Contents of URL" → `https://your-app.up.railway.app/latest.png` →
"Set Wallpaper". Since the endpoint always serves whatever the latest run
produced, the shortcut doesn't need to know when a new episode dropped.

## Deploying for free forever (GitHub Actions + Pages)

No server, no trial credits, no sleep. A scheduled GitHub Action runs the
same pipeline and writes `docs/latest.png`, `docs/latest.json`, and
`docs/index.html` straight into the repo; GitHub Pages serves that folder
as a static site.

1. Push this repo to GitHub (public or private — either works within the
   free Actions minutes quota).
2. **Settings → Secrets and variables → Actions → New repository secret** —
   add `GEMINI_API_KEY` with your key.
3. **Settings → Pages** — set Source to "Deploy from a branch", branch
   `main`, folder `/docs`. Save.
4. **Actions** tab → run the "WAN Show Wallpaper" workflow once manually
   (`Run workflow` button) so `docs/` gets its first commit.
5. Your site is now live at `https://<username>.github.io/<repo>/`, with
   the wallpaper at `.../latest.png` and data at `.../latest.json`.

The workflow (`.github/workflows/wan-show.yml`) runs every 3 hours by
default — edit the `cron` line to change that. It commits to the repo only
when the episode actually changes, so most runs are no-ops.

**Trade-off vs. the Railway/Express version**: the image only updates when
the workflow runs, not on-demand per request. For a weekly show that's
irrelevant — just make sure the schedule covers shortly after WAN Show
usually airs (Fridays) plus a little buffer for captions to process.

You don't need both deployment styles at once — `src/index.js` /
Railway is the always-on server version, `scripts/generate.mjs` +
Actions/Pages is the static free-forever version. Pick one.

## Tuning

- `src/image.js` — wallpaper dimensions, gradient palette, font size/wrap
  width, headline vertical position.
- `src/summarize.js` — the prompt controlling headline/paragraph style.
- `src/config.js` — cron schedule, channel ID, Gemini model.
