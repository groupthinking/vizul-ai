import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_TOKEN;

if (!apiKey) {
  console.error('Missing AI_GATEWAY_API_KEY (or AI_GATEWAY_TOKEN). Run `vercel link` + `vercel env pull` first.');
  process.exit(1);
}

const gateway = createOpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1'
});

try {
  const result = streamText({
    model: gateway('openai/gpt-5.5'),
    prompt: 'Reply with one short sentence confirming AI Gateway connectivity for Vizul.ai.'
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  process.stdout.write('\n');
} catch (error) {
  console.error(error?.message || 'AI Gateway verification failed.');
  process.exit(1);
}
