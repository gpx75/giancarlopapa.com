import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing suggestion ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data: suggestion, error: fetchError } = await db
    .from('job_suggestions')
    .select('id, description, title, company, location')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }

  if (!suggestion.description) {
    throw createError({
      statusCode: 400,
      message: 'No description to analyze. Add one first.'
    });
  }

  const locationScore = scoreLocation(suggestion.location);

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const systemPrompt = buildImpactAnalysisPrompt(locationScore);

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Resume (background only — do not narrate it back):\n${resumeText}\n\n---\n\nJob: ${suggestion.title} at ${suggestion.company}\nLocation: ${suggestion.location ?? 'not specified'} (pre-scored: ${locationScore}/100)\nDescription:\n${suggestion.description}`
        }
      ],
      system: systemPrompt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    throw createError({
      statusCode: 502,
      message: `AI request failed: ${msg}`
    });
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw createError({
      statusCode: 502,
      message: 'Unexpected AI response format.'
    });
  }

  let analysis;
  const rawText = textBlock.text.trim();
  try {
    const cleaned = rawText
      .replace(/^```json?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    analysis = JSON.parse(cleaned);
  } catch {
    const numMatch = rawText.match(/(\d{1,3})/);
    if (numMatch) {
      analysis = { match_rate: Number(numMatch[1]) };
    } else {
      console.error('[suggestion-analyze] Could not parse:', rawText);
      throw createError({
        statusCode: 502,
        message: 'Could not parse AI response.'
      });
    }
  }

  const matchRate = Math.min(
    100,
    Math.max(0, Math.round(Number(analysis.match_rate) || 0))
  );
  const breakdown = {
    skills: Number(analysis.skills) || 0,
    experience: Number(analysis.experience) || 0,
    industry: Number(analysis.industry) || 0,
    seniority: Number(analysis.seniority) || 0,
    techStack: Number(analysis.techStack) || 0,
    location: locationScore,
    summary: String(analysis.summary || ''),
    strongMatches: Array.isArray(analysis.strongMatches)
      ? analysis.strongMatches
      : [],
    gaps: Array.isArray(analysis.gaps) ? analysis.gaps : [],
    companyPainPoints: Array.isArray(analysis.companyPainPoints)
      ? analysis.companyPainPoints
      : [],
    valueDelivered: Array.isArray(analysis.valueDelivered)
      ? analysis.valueDelivered
      : [],
    measurableImpact: Array.isArray(analysis.measurableImpact)
      ? analysis.measurableImpact
      : [],
    whyJoin: String(analysis.whyJoin || '')
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
