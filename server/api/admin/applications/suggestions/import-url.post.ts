import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

function detectSourceFromUrl(url: string): string {
  if (url.includes('linkedin.com')) return 'jsearch-linkedin';
  if (url.includes('indeed.com') || url.includes('indeed.ch'))
    return 'jsearch-indeed';
  if (url.includes('glassdoor.com') || url.includes('glassdoor.ch'))
    return 'jsearch-glassdoor';
  if (url.includes('swissdevjobs.ch')) return 'swissdevjobs';
  if (url.includes('jobs.ch')) return 'jobsch';
  return 'manual';
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const url = body.url?.trim();

  if (!url) {
    throw createError({ statusCode: 400, message: 'URL is required.' });
  }

  // Fetch the page content
  let pageText: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    pageText = await response.text();
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Could not fetch URL. Try pasting the job description directly.'
    });
  }

  // Strip HTML tags to get plain text (rough extraction)
  const plainText = pageText
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32000); // Generous cap; Haiku 4.5 handles this easily.

  if (plainText.length < 50) {
    throw createError({
      statusCode: 400,
      message:
        'Could not extract content from URL. Try pasting the job description manually.'
    });
  }

  // Use AI to extract structured job data
  const anthropic = useAnthropic();

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Extract job posting details from this page content:\n\n${plainText}`
        }
      ],
      system: `Extract structured job information from the page content. Return a single JSON object with these fields:
- title: job title (required)
- company: company name (required)
- location: job location (or "Not specified")
- description: the FULL job description, including responsibilities, requirements, tech stack, team context, and any "about us" sections. Preserve paragraphs as readable plain text (use \\n\\n between sections). Do NOT summarise. Do NOT shorten. Include everything substantive from the posting.

If you cannot identify a job posting in the content, return: { "error": "No job posting found" }

Respond with JSON only, no markdown fences.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    throw createError({
      statusCode: 502,
      message: `AI extraction failed: ${msg}`
    });
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response.' });
  }

  let extracted;
  try {
    extracted = JSON.parse(textBlock.text);
  } catch {
    throw createError({
      statusCode: 502,
      message: 'Could not parse AI response.'
    });
  }

  if (extracted.error) {
    throw createError({ statusCode: 400, message: extracted.error });
  }

  if (!extracted.title || !extracted.company) {
    throw createError({
      statusCode: 400,
      message: 'Could not extract job title and company from URL.'
    });
  }

  // Create suggestion
  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data, error: insertError } = await db
    .from('job_suggestions')
    .insert({
      title: extracted.title,
      company: extracted.company,
      url,
      location: extracted.location || null,
      description: extracted.description || null,
      source: detectSourceFromUrl(url)
    })
    .select()
    .single();

  if (insertError) {
    throw createError({ statusCode: 500, message: insertError.message });
  }

  return data;
});
