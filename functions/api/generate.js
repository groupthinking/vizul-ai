const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

function buildPrompt({ prompt, chartType, tone }) {
  const insightTone = tone || 'executive';

  return `You are Vizul.ai, an AI data visualization assistant.
Return only valid JSON with this exact shape:
{
  "title": "short chart title",
  "chartType": "bar|line|pie|doughnut",
  "datasetLabel": "short dataset label",
  "labels": ["label"],
  "values": [number],
  "insight": "one concise insight in ${insightTone} style",
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

function parseModelJson(text) {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function generateWithAIGateway({ prompt, chartType, tone, apiKey, model }) {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-5.5',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildPrompt({ prompt, chartType, tone }) }]
    })
  });

  if (!response.ok) {
    throw new Error(`AI Gateway request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI Gateway did not return chart data.');
  return validateResult(parseModelJson(text));
}

async function generateWithGemini({ prompt, chartType, tone, apiKey }) {
  const geminiResponse = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt({ prompt, chartType, tone }) }] }],
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
  return validateResult(parseModelJson(text));
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

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const gatewayApiKey = env.AI_GATEWAY_API_KEY || env.AI_GATEWAY_TOKEN || env.VERCEL_OIDC_TOKEN;
  const gatewayModel = env.AI_GATEWAY_MODEL || 'openai/gpt-5.5';
  const geminiApiKey = env.GEMINI_API_KEY;
  if (!gatewayApiKey && !geminiApiKey) {
    return jsonResponse(503, { error: 'Configure AI_GATEWAY_API_KEY (preferred) or GEMINI_API_KEY.' });
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
    const safePrompt = prompt.slice(0, 4000);
    const result = gatewayApiKey
      ? await generateWithAIGateway({ prompt: safePrompt, chartType, tone, apiKey: gatewayApiKey, model: gatewayModel })
      : await generateWithGemini({ prompt: safePrompt, chartType, tone, apiKey: geminiApiKey });

    return jsonResponse(200, result);
  } catch (error) {
    return jsonResponse(502, { error: error.message || 'Failed to generate visualization.' });
  }
}
