import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, job_description, location, work_model, priority, workflow')
    .eq('id', numericId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  if (!app.job_description) {
    throw createError({ statusCode: 400, message: 'No job description to analyze. Add one first.' });
  }

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  // Derive location score deterministically: prefer work_model context, fall back to location field
  const locationSource = app.work_model === 'remote' ? 'remote'
    : app.work_model === 'hybrid' && app.location ? `hybrid ${app.location}`
    : app.location ?? null;
  const locationScore = scoreLocation(locationSource);

  const locationContext = app.location || app.work_model
    ? `Job location: ${app.location ?? 'not specified'}, Work model: ${app.work_model ?? 'not specified'} (pre-scored: ${locationScore}/100)`
    : `Job location and work model: not specified — infer from description (location pre-scored: ${locationScore}/100)`;

  const systemPrompt = buildImpactAnalysisPrompt(locationScore);

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Resume (background only — do not narrate it back):\n${resumeText}\n\n---\n\n${locationContext}\n\nJob Description:\n${app.job_description}`
      }],
      system: systemPrompt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    console.error('[analyze] Anthropic API error:', msg);
    throw createError({ statusCode: 502, message: `AI request failed: ${msg}` });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response format.' });
  }

  let analysis;
  try {
    const raw = textBlock.text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    analysis = JSON.parse(raw);
  } catch {
    console.error('[analyze] Failed to parse AI response:', textBlock.text.slice(0, 300));
    throw createError({ statusCode: 502, message: 'Could not parse AI response as JSON.' });
  }

  const matchRate = Math.round(Number(analysis.match_rate) || 0);
  const breakdown = {
    skills: Number(analysis.skills) || 0,
    experience: Number(analysis.experience) || 0,
    industry: Number(analysis.industry) || 0,
    seniority: Number(analysis.seniority) || 0,
    techStack: Number(analysis.techStack) || 0,
    location: locationScore,
    summary: String(analysis.summary || ''),
    strongMatches: Array.isArray(analysis.strongMatches) ? analysis.strongMatches : [],
    gaps: Array.isArray(analysis.gaps) ? analysis.gaps : [],
    companyPainPoints: Array.isArray(analysis.companyPainPoints) ? analysis.companyPainPoints : [],
    valueDelivered: Array.isArray(analysis.valueDelivered) ? analysis.valueDelivered : [],
    measurableImpact: Array.isArray(analysis.measurableImpact) ? analysis.measurableImpact : [],
    whyJoin: String(analysis.whyJoin || ''),
  };

  // Mark analyze stage complete and unlock prioritize.
  const nextWorkflow = applyTransition(normalizeWorkflow(app.workflow), {
    stage: 'analyze',
    action: 'complete',
    meta: { match_rate: matchRate }
  });

  const { data: updated, error: updateError } = await db
    .from('job_applications')
    .update({ match_rate: matchRate, match_breakdown: breakdown, workflow: nextWorkflow })
    .eq('id', numericId)
    .select()
    .single();

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  // Suggest a priority tier if the application has none yet
  let suggestedPriority: 'p0' | 'p1' | 'p2' | null = null;
  if (!app.priority) {
    if (matchRate >= 80) suggestedPriority = 'p0';
    else if (matchRate >= 60) suggestedPriority = 'p1';
    else suggestedPriority = 'p2';
  }

  return { ...updated, suggestedPriority };
});
