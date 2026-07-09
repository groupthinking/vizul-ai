# Vizul.ai

Vizul.ai is a lightweight AI data visualization app. Users paste data or a visualization request, then the app asks an AI model to return chart-ready JSON and renders the result with Chart.js.

## Features

- Static frontend in `index.html`
- Vercel AI Gateway-first API route for chart generation (Gemini fallback supported)
- Local fallback chart extraction when the API is unavailable
- Vercel serverless function at `api/generate.js`
- Cloudflare Pages Function at `functions/api/generate.js`

## Environment

Set one of these environment variables in Vercel or Cloudflare:

```text
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
AI_GATEWAY_MODEL=openai/gpt-5.5
GEMINI_API_KEY=your_google_gemini_api_key
```

`AI_GATEWAY_API_KEY` is the preferred path. `GEMINI_API_KEY` is still supported as a fallback.

Do not commit real API keys to the repository.

## Run locally

Because the frontend is static, you can preview it with any static file server:

```bash
python3 -m http.server 3000
```

The local static server will not run the hosted API function, so the app will show the built-in fallback chart unless you run it through a provider emulator.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `AI_GATEWAY_API_KEY` (preferred) or `GEMINI_API_KEY` in Project Settings > Environment Variables.
3. Keep the build command empty or use `npm run build`.
4. Deploy. Vercel serves the API at `/api/generate`.

## Deploy to Cloudflare Pages

1. Create a Cloudflare Pages project from this repository.
2. Set the build output directory to `.`.
3. Add `AI_GATEWAY_API_KEY` (preferred) or `GEMINI_API_KEY` in Settings > Environment variables.
4. Deploy. Cloudflare serves the Pages Function at `/api/generate`.

## AI Gateway setup

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Install agent integration:
   - Claude Code / Cursor:
     ```bash
     npx plugins add vercel/vercel-plugin
     ```
   - Other agents:
     ```bash
     npx skills add vercel-labs/agent-skills
     ```
3. Link and pull project environment:
   ```bash
   vercel link
   vercel env pull .env.local
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Verify AI Gateway with streaming text (`openai/gpt-5.5`):
   ```bash
   npm run verify:gateway
   ```

## Validation

```bash
npm test
npm run build
```
