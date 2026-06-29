# Vizul.ai

Vizul.ai is a lightweight AI data visualization app. Users paste data or a visualization request, then the app asks Gemini to return chart-ready JSON and renders the result with Chart.js.

## Features

- Static frontend in `index.html`
- Gemini-backed API route for chart generation
- Local fallback chart extraction when the API is unavailable
- Vercel serverless function at `api/generate.js`
- Cloudflare Pages Function at `functions/api/generate.js`

## Environment

Set this environment variable in Vercel or Cloudflare:

```text
GEMINI_API_KEY=your_google_gemini_api_key
```

Do not commit real API keys to the repository.

## Run locally

Because the frontend is static, you can preview it with any static file server:

```bash
python3 -m http.server 3000
```

The local static server will not run the hosted API function, so the app will show the built-in fallback chart unless you run it through a provider emulator.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `GEMINI_API_KEY` in Project Settings > Environment Variables.
3. Keep the build command empty or use `npm run build`.
4. Deploy. Vercel serves the API at `/api/generate`.

## Deploy to Cloudflare Pages

1. Create a Cloudflare Pages project from this repository.
2. Set the build output directory to `.`.
3. Add `GEMINI_API_KEY` in Settings > Environment variables.
4. Deploy. Cloudflare serves the Pages Function at `/api/generate`.

## Validation

```bash
npm test
npm run build
```
