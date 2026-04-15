import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages';

export function useAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NUXT_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw createError({ statusCode: 503, message: 'Anthropic API not configured. Set ANTHROPIC_API_KEY in .env' });
  }

  return new Anthropic({ apiKey });
}

export async function callAnthropicWithRetry(
  client: Anthropic,
  params: MessageCreateParamsNonStreaming,
  maxRetries = 5
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as Record<string, unknown>)?.status;
      const isRetryable = msg.includes('529') || msg.includes('Overloaded') || msg.includes('overloaded') || status === 529 || status === 529;
      if (isRetryable && attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s
        console.log(`[anthropic] Overloaded (attempt ${attempt}/${maxRetries}), retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}
