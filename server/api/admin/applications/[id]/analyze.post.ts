import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, job_description, location, work_model, priority')
    .eq('id', id)
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

  const systemPrompt = `You are a job-market analyst. Compare the candidate's resume against a job description.

CANDIDATE CONTEXT:
- Based in Elsau ZH, Switzerland (Zurich area, ~25 min from Zurich city)
- Location has been pre-scored as ${locationScore}/100 using a distance model.
  Use this exact value for the location dimension — do not recalculate it.

Rate the match on these dimensions (each 0–100):
- skills: How well do the candidate's technical skills match the requirements?
- experience: Does the candidate's experience level, years, and domain match?
- industry: How relevant is the candidate's industry background?
- seniority: Does the seniority level match?
- techStack: How many of the required technologies does the candidate know?

Compute overall match_rate as:
  skills × 0.27 + techStack × 0.22 + experience × 0.22 + seniority × 0.09 + industry × 0.09 + ${locationScore} × 0.11

Also provide:
- summary: 2-3 sentence explanation of the match quality
- strongMatches: array of specific skills, technologies, or experiences that match strongly (max 8)
- gaps: array of requirements the candidate doesn't clearly meet (max 6)

Respond with a single JSON object only. No markdown fences, no extra text.
Example:
{
  "match_rate": 78,
  "skills": 85,
  "experience": 80,
  "industry": 60,
  "seniority": 75,
  "techStack": 82,
  "summary": "Strong match on ...",
  "strongMatches": ["PHP", "Vue.js"],
  "gaps": ["AWS certification"]
}`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Resume:\n${resumeText}\n\n---\n\n${locationContext}\n\nJob Description:\n${app.job_description}`
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
    gaps: Array.isArray(analysis.gaps) ? analysis.gaps : []
  };

  const { data: updated, error: updateError } = await db
    .from('job_applications')
    .update({ match_rate: matchRate, match_breakdown: breakdown })
    .eq('id', id)
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
