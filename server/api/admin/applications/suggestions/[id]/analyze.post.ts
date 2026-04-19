import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing suggestion ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: suggestion, error: fetchError } = await db
    .from('job_suggestions')
    .select('id, description, title, company, location')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }

  if (!suggestion.description) {
    throw createError({ statusCode: 400, message: 'No description to analyze. Add one first.' });
  }

  const locationScore = scoreLocation(suggestion.location);

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const systemPrompt = `You are a job-market analyst. Compare the candidate's resume against a job description.

CANDIDATE CONTEXT:
- Based in Elsau ZH, Switzerland (Zurich area, ~25 min from Zurich city)
- Location has been pre-scored as ${locationScore}/100 based on distance from candidate's home.
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
- summary: 2–3 sentence explanation of the match quality
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
        content: `Resume:\n${resumeText}\n\n---\n\nJob: ${suggestion.title} at ${suggestion.company}\nLocation: ${suggestion.location ?? 'not specified'} (pre-scored: ${locationScore}/100)\nDescription:\n${suggestion.description}`
      }],
      system: systemPrompt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    throw createError({ statusCode: 502, message: `AI request failed: ${msg}` });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({ statusCode: 502, message: 'Unexpected AI response format.' });
  }

  let analysis;
  const rawText = textBlock.text.trim();
  try {
    const cleaned = rawText.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    analysis = JSON.parse(cleaned);
  } catch {
    const numMatch = rawText.match(/(\d{1,3})/);
    if (numMatch) {
      analysis = { match_rate: Number(numMatch[1]) };
    } else {
      console.error('[suggestion-analyze] Could not parse:', rawText);
      throw createError({ statusCode: 502, message: 'Could not parse AI response.' });
    }
  }

  const matchRate = Math.min(100, Math.max(0, Math.round(Number(analysis.match_rate) || 0)));
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
  };

  const { data: updated, error: updateError } = await db
    .from('job_suggestions')
    .update({ match_rate: matchRate, match_breakdown: breakdown })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return updated;
});
