export function renderIndexHtml(state) {
  if (!state) {
    return '<p>No episode processed yet. Check back soon.</p>';
  }
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${state.headline}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #111; }
    img { width: 100%; border-radius: 24px; }
    h1 { font-size: 1.4rem; }
    a { color: #2c5364; }
  </style>
</head>
<body>
  <img src="./latest.png?v=${encodeURIComponent(state.videoId)}" alt="Wallpaper">
  <h1>${state.headline}</h1>
  <p>${state.paragraph}</p>
  <p><a href="${state.videoUrl}" target="_blank">Watch: ${state.videoTitle}</a></p>
</body>
</html>`;
}
