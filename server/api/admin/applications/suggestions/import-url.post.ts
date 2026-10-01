import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { importSwissDevJob } from '~~/server/utils/job-sources/swissdevjobs';
import { importBambooHrJob } from '~~/server/utils/job-sources/bamboohr';

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

interface ExtractedJob {
  title: string;
  company: string;
  location?: string;
  description?: string;
}

// Shown with every failure — the UI then offers a paste field.
const PASTE_HINT = 'Paste the job description below instead.';

// An empty client-side-rendered shell yields far less text than a real
// posting; below this, render the page in a headless browser.
const MIN_PAGE_TEXT = 800;

/** Plain text (plus any schema.org JSON-LD) of a downloaded HTML page. */
function htmlToPageText(html: string): string {
  // Keep JSON-LD (schema.org JobPosting) — JS-rendered job boards often
  // only expose the posting there, and the script strip below would drop it.
  const jsonLd = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ]
    .map((m) => m[1]?.trim())
    .filter(Boolean)
    .join('\n');

  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return [jsonLd, bodyText].filter(Boolean).join('\n\n');
}

/**
 * Page text for the AI: a plain download first; if that is blocked or only
 * an empty JavaScript shell, the page rendered in headless Chrome.
 */
async function getPageText(url: string): Promise<string> {
  let text = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if (response.ok) text = htmlToPageText(await response.text());
  } catch {
    // Unreachable or blocked — fall through to the browser.
  }

  if (text.length < MIN_PAGE_TEXT) {
    const rendered = await renderPageText(url);
    if (rendered && rendered.length > text.length) text = rendered;
  }
  return text;
}

/**
 * Let the model pull the job out of page or pasted text. With a pasted
 * description the text is kept verbatim and only title/company/location
 * are extracted.
 */
async function extractJobWithAI(content: string, pasted: boolean): Promise<ExtractedJob> {
  const fields = pasted
    ? '- title: job title (required)\n- company: company name (required)\n- location: job location (or "Not specified")'
    : '- title: job title (required)\n- company: company name (required)\n- location: job location (or "Not specified")\n- description: the FULL job description, including responsibilities, requirements, tech stack, team context, and any "about us" sections. Preserve paragraphs as readable plain text (use \\n\\n between sections). Do NOT summarise. Do NOT shorten. Include everything substantive from the posting.';

  const anthropic = useAnthropic();
  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: pasted ? 1024 : 16000, // Full verbatim descriptions easily exceed 4k tokens
      messages: [
        {
          role: 'user',
          content: `Extract job posting details from this ${pasted ? 'job description' : 'page content'}:\n\n${content.slice(0, 32000)}`
        }
      ],
      system: `Extract structured job information. Return a single JSON object with these fields:
${fields}

If you cannot identify a job posting in the content, return: { "error": "No job posting found" }

Respond with JSON only, no markdown fences.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    throw createError({ statusCode: 502, message: `AI extraction failed: ${msg}` });
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response.' });
  }
  if (response.stop_reason === 'max_tokens') {
    throw createError({ statusCode: 502, message: `Job description too long for AI extraction. ${PASTE_HINT}` });
  }

  let extracted;
  try {
    extracted = JSON.parse(stripJsonFence(textBlock.text));
  } catch {
    console.error('[import-url] Unparseable AI response:', textBlock.text.slice(0, 500));
    throw createError({ statusCode: 502, message: `Could not parse AI response. ${PASTE_HINT}` });
  }

  if (extracted.error || !extracted.title || !extracted.company) {
    throw createError({
      statusCode: 422,
      message: pasted
        ? 'Could not find a job title and company in the pasted text.'
        : `No job posting found at this URL (the site may block automated access). ${PASTE_HINT}`
    });
  }

  return pasted ? { ...extracted, description: content } : (extracted as ExtractedJob);
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string; text?: string }>(event);
  const url = body.url?.trim();
  const pastedText = body.text?.trim();

  if (!url) {
    throw createError({ statusCode: 400, message: 'URL is required.' });
  }

  let extracted: ExtractedJob;
  if (pastedText) {
    if (pastedText.length < 200) {
      throw createError({ statusCode: 400, message: 'The pasted text is too short — paste the full job description.' });
    }
    extracted = await extractJobWithAI(pastedText, true);
  } else {
    // Known client-side-rendered boards: read their structured data directly.
    const structured = (await importSwissDevJob(url)) ?? (await importBambooHrJob(url));
    if (structured) {
      extracted = structured;
    } else {
      const pageText = await getPageText(url);
      if (pageText.length < 50) {
        throw createError({ statusCode: 422, message: `Could not read this page. ${PASTE_HINT}` });
      }
      extracted = await extractJobWithAI(pageText, false);
    }
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
