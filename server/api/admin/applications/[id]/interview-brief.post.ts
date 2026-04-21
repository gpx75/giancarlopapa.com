import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate a structured interview-prep brief for a single application.
 *
 * Output: a markdown-friendly plain-text brief with sections for company
 * research, role mapping, likely interview topics, talking points tied to
 * the impact framing (companyPainPoints / valueDelivered / measurableImpact),
 * and questions to ask. The brief is returned to the client; persistence
 * into the workflow's `interview_prep.notes` field is handled by the UI so
 * the user can edit before saving.
 */
export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id');
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, company, position, location, work_model, job_description, match_breakdown')
    .eq('id', id)
    .single();

  if (fetchError || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const breakdown = app.match_breakdown ?? {};
  const impactCtx = [
    breakdown.summary ? `Match summary: ${breakdown.summary}` : '',
    breakdown.companyPainPoints?.length
      ? `Likely company pain points:\n- ${breakdown.companyPainPoints.join('\n- ')}`
      : '',
    breakdown.valueDelivered?.length
      ? `What I would deliver:\n- ${breakdown.valueDelivered.join('\n- ')}`
      : '',
    breakdown.measurableImpact?.length
      ? `Measurable impact:\n- ${breakdown.measurableImpact.join('\n- ')}`
      : '',
    breakdown.whyJoin ? `Why join: ${breakdown.whyJoin}` : '',
    breakdown.strongMatches?.length ? `Strong matches: ${breakdown.strongMatches.join(', ')}` : '',
    breakdown.gaps?.length ? `Gaps to address: ${breakdown.gaps.join(', ')}` : ''
  ].filter(Boolean).join('\n\n');

  const systemPrompt = `You write concise, high-signal interview preparation briefs for a Senior Full Stack Engineer (Giancarlo Papa) preparing for an interview.

Output a plain-text brief in markdown with these exact sections, in this order:

## Company snapshot
3–5 bullets the candidate should know cold (mission, product, scale, recent news / direction). Infer from the job description and company name. Mark inferred items with "(inferred)".

## Role essentials
3–5 bullets summarising what the role really is (responsibilities, scope, team shape, stack).

## Likely interview topics
5–8 bullets — concrete topics, not generic advice. Mix technical, system design, and behavioural. Anchor each to specific JD signals where possible.

## Talking points (impact-anchored)
3–5 bullets that turn the company's pain points into stories the candidate can tell. Use the "What I would deliver" + "Measurable impact" context. Each bullet: <pain> → <my approach> → <expected outcome>.

## Questions to ask them
5–7 sharp, senior-engineer questions. Avoid clichés ("what's the culture like"). Probe trade-offs, ownership, technical debt, decision-making, what success looks like in 6 months.

## Logistics & gaps
2–3 bullets covering: gaps to acknowledge proactively (from "Gaps to address"), things to double-check before the call (timezone, format, panel composition), and anything specific to confirm.

Tone: precise, senior, no fluff. Write in the candidate's voice ("I", "my"). No filler intros, no closing summary.`;

  const userContent = `Resume (background only — do not narrate it back):\n${resumeText}\n\n---\n\nCompany: ${app.company}\nPosition: ${app.position}\nLocation: ${app.location ?? 'not specified'}\nWork model: ${app.work_model ?? 'not specified'}\n\nJob description:\n${app.job_description ?? '(not available)'}\n\n${impactCtx ? `---\n\nMatch analysis context:\n${impactCtx}` : ''}`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: userContent }],
      system: systemPrompt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    throw createError({ statusCode: 502, message: `AI request failed: ${msg}` });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response.' });
  }

  return {
    brief: textBlock.text.trim(),
    based_on_match_analysis: Boolean(breakdown.companyPainPoints?.length || breakdown.valueDelivered?.length)
  };
});
