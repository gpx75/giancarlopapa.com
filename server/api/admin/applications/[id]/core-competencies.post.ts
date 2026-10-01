import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Tailors the CV's "Core Competencies" section to one job ad: each competency
// maps a key requirement from the ad 1:1 to proof from the resume. (The
// headline already mirrors the ad title — see buildTailoredResumeHtml.)
const SYSTEM_PROMPT = [
  'You tailor a software engineer\'s CV to a specific job ad. Relevance is the guiding principle: the CV must answer the pain points of the ad.',
  '',
  'Return a single JSON object:',
  '{ "coreCompetencies": [{ "requirement": "<key requirement>", "proof": "<proof>" }] }',
  '',
  'Rules:',
  '- "coreCompetencies": the 5–7 most important requirements from the ad, in the ad\'s order of importance.',
  '- "requirement": copied VERBATIM from the ad — the exact words, in the ad\'s original language, including parentheses such as "(Laravel, Symfony oder Ähnliches)". Do not translate, paraphrase, shorten or fix spelling: ATS systems and recruiters match the exact phrase. Only drop a leading bullet or trailing punctuation.',
  '- "proof": one line (max ~20 words) in the SAME language as the ad, with evidence taken ONLY from the resume JSON — years of experience, a named project, a success story. Include a measurable result (facts & figures) whenever the resume has one. Never invent numbers, employers, projects or technologies.',
  '- If the resume has no real proof for a requirement, pick the closest transferable evidence and keep it honest; skip the requirement if there is none.',
  '- No first person, no buzzwords.',
  '',
  'Respond with JSON only, no markdown fences.'
].join('\n');

/** Lowercase, unify quotes/dashes, collapse whitespace — for verbatim checks. */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[„“”«»"]/g, '"')
    .replace(/[‘’‚']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data: app, error } = await db
    .from('job_applications')
    .select('position, company, job_description, tailored_resume, language')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }
  if (!app.job_description) {
    throw createError({
      statusCode: 400,
      message: 'No job description. Add one first.'
    });
  }

  // getResumeJsonFor() returns a shared cached object — never mutate it.
  const resume = structuredClone(
    (app.tailored_resume as Record<string, unknown> | null) ?? getResumeJsonFor(app.language)
  ) as Record<string, unknown> & { basics: Record<string, unknown> };

  const anthropic = useAnthropic();
  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content:
            `Job ad: ${app.position} at ${app.company}\n\n${app.job_description}\n\n---\n\n` +
            `Resume JSON:\n${JSON.stringify(resume)}`
        }
      ],
      system: SYSTEM_PROMPT
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    throw createError({ statusCode: 502, message: `AI request failed: ${msg}` });
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response.' });
  }

  let parsed: {
    coreCompetencies?: Array<{ requirement?: unknown; proof?: unknown }>;
  };
  try {
    parsed = JSON.parse(stripJsonFence(textBlock.text));
  } catch {
    console.error('[core-competencies] Unparseable AI response:', textBlock.text.slice(0, 500));
    throw createError({ statusCode: 502, message: 'Could not parse AI response.' });
  }

  const coreCompetencies = (parsed.coreCompetencies ?? [])
    .filter(
      (c): c is { requirement: string; proof: string } =>
        typeof c.requirement === 'string' &&
        typeof c.proof === 'string' &&
        c.requirement.trim() !== '' &&
        c.proof.trim() !== ''
    )
    .map((c) => ({
      requirement: c.requirement.trim().replace(/^[-•*·\s]+|[.;,:\s]+$/g, ''),
      proof: c.proof.trim()
    }));

  // The point of the section is a 1:1, word-for-word match with the ad —
  // drop anything the model paraphrased or translated instead of copying.
  const ad = normalizeForMatch(app.job_description);
  const verbatim = coreCompetencies.filter((c) =>
    ad.includes(normalizeForMatch(c.requirement))
  );
  const dropped = coreCompetencies.length - verbatim.length;
  if (dropped > 0) {
    console.warn(
      `[core-competencies] Dropped ${dropped} non-verbatim requirement(s):`,
      coreCompetencies.filter((c) => !verbatim.includes(c)).map((c) => c.requirement)
    );
  }

  if (verbatim.length === 0) {
    throw createError({
      statusCode: 502,
      message: 'AI returned no usable competencies.'
    });
  }

  resume.basics.coreCompetencies = verbatim;

  const { error: updateError } = await db
    .from('job_applications')
    .update({ tailored_resume: resume })
    .eq('id', id);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return resume;
});
