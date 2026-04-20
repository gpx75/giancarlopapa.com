import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CvSuggestion } from '~/types/applications';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, company, position, job_description, match_breakdown')
    .eq('id', id)
    .single();

  if (fetchError || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  if (!app.job_description) {
    throw createError({ statusCode: 400, message: 'No job description. Add one first.' });
  }

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const gapsContext = app.match_breakdown?.gaps?.length
    ? `\nKnown gaps from match analysis: ${(app.match_breakdown.gaps as string[]).join(', ')}`
    : '';

  const systemPrompt = `You are a senior technical recruiter and CV coach specialising in software engineering roles.

Based on the candidate's resume and the target job description, generate specific, actionable CV improvement suggestions that would maximise their chances of getting this role.

Focus on:
1. Missing keywords, skills, or certifications the JD requires that aren't clearly on the CV
2. Experiences or achievements that should be emphasised more prominently
3. Quantifiable results the candidate likely has but hasn't surfaced
4. CV sections or phrasing that could be reframed to better match the role

Rules:
- Be specific (name the exact technology, section, or bullet point to change)
- Be actionable (tell them exactly what to write or add, not just "add more detail")
- Prioritise ruthlessly: high = would likely improve shortlisting, medium = good to have, low = minor polish
- Do not repeat what's already strong on the CV
- Maximum 6 suggestions

Respond with a JSON array only. No markdown fences, no extra text.
Example:
[
  {
    "section": "Skills",
    "issue": "Kubernetes not listed but required",
    "suggestion": "Add 'Kubernetes (production cluster management, 50+ node clusters since 2021)' under Cloud/DevOps skills",
    "priority": "high"
  }
]`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Target role: ${app.position} at ${app.company}${gapsContext}\n\nResume:\n${resumeText}\n\n---\n\nJob Description:\n${app.job_description}`
      }],
      system: systemPrompt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    console.error('[cv-suggestions] Anthropic error:', msg);
    throw createError({ statusCode: 502, message: `AI request failed: ${msg}` });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response format.' });
  }

  let suggestions: CvSuggestion[];
  try {
    const raw = textBlock.text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(raw);
    suggestions = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('[cv-suggestions] Failed to parse:', textBlock.text.slice(0, 300));
    throw createError({ statusCode: 502, message: 'Could not parse AI response.' });
  }

  await db.from('job_applications').update({ cv_suggestions: suggestions }).eq('id', id);

  return suggestions;
});
