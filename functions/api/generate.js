const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt({ prompt, chartType, tone }) {
  return `You are Vizul.ai, an AI data visualization assistant.
Return only valid JSON with this exact shape:
{
  "title": "short chart title",
  "chartType": "bar|line|pie|doughnut",
  "datasetLabel": "short dataset label",
  "labels": ["label"],
  "values": [number],
  "insight": "one concise insight in ${tone || 'executive'} style",
  "recommendation": "one concise recommended next step"
}

Rules:
- Use the user's preferred chart type when it is not "auto"; otherwise choose the best chart.
- Include between 2 and 8 labels.
- values must be numbers only.
- Do not include markdown fences or extra text.

Preferred chart type: ${chartType || 'auto'}
User data/request: ${prompt}`;
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function validateResult(result) {
  const chartTypes = new Set(['bar', 'line', 'pie', 'doughnut']);
  if (!result || typeof result !== 'object') throw new Error('Invalid AI response.');
  if (!chartTypes.has(result.chartType)) result.chartType = 'bar';
  if (!Array.isArray(result.labels) || !Array.isArray(result.values)) throw new Error('AI response did not include chart data.');

  const length = Math.min(result.labels.length, result.values.length, 8);
  result.labels = result.labels.slice(0, length).map((label) => String(label).slice(0, 80));
  result.values = result.values.slice(0, length).map(Number);

  if (length < 2 || result.values.some((value) => !Number.isFinite(value))) {
    throw new Error('AI response included unusable chart values.');
  }

  return {
    title: String(result.title || 'Generated visualization').slice(0, 120),
    chartType: result.chartType,
    datasetLabel: String(result.datasetLabel || 'Value').slice(0, 80),
    labels: result.labels,
    values: result.values,
    insight: String(result.insight || 'Review the generated chart for the key trend.').slice(0, 500),
    recommendation: String(result.recommendation || 'Refine the prompt with more context for deeper analysis.').slice(0, 500)
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return jsonResponse(503, { error: 'GEMINI_API_KEY is not configured.' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON request.' });
  }

  const { prompt, chartType = 'auto', tone = 'executive' } = payload;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return jsonResponse(400, { error: 'Please provide data or a visualization request.' });
  }

  try {
    const geminiResponse = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ prompt: prompt.slice(0, 4000), chartType, tone }) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini request failed with status ${geminiResponse.status}.`);
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini did not return chart data.');

    return jsonResponse(200, validateResult(parseGeminiJson(text)));
  } catch (error) {
    return jsonResponse(502, { error: error.message || 'Failed to generate visualization.' });
  }
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  return jsonResponse(405, { error: 'Method not allowed.' });
}
