export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing suggestion ID.' });
  }

  const db = useSupabaseServer();

  const { data: suggestion, error: fetchError } = await db
    .from('job_suggestions')
    .select('id, description, title, company')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }

  if (!suggestion.description) {
    throw createError({ statusCode: 400, message: 'No description to analyze. Add one first.' });
  }

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const systemPrompt = `You are a job-market analyst. Compare the candidate's resume against a job description.

Rate the overall match from 0 to 100 as a weighted average of:
- skills × 0.30 + techStack × 0.25 + experience × 0.25 + seniority × 0.10 + industry × 0.10

Respond with a single JSON object only. No markdown fences.
Example: { "match_rate": 72 }`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Resume:\n${resumeText}\n\n---\n\nJob: ${suggestion.title} at ${suggestion.company}\nDescription:\n${suggestion.description}`
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
    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    analysis = JSON.parse(cleaned);
  } catch {
    // Try to extract match_rate from raw text as fallback
    const numMatch = rawText.match(/(\d{1,3})/);
    if (numMatch) {
      analysis = { match_rate: Number(numMatch[1]) };
    } else {
      console.error('[suggestion-analyze] Could not parse:', rawText);
      throw createError({ statusCode: 502, message: 'Could not parse AI response.' });
    }
  }

  const matchRate = Math.min(100, Math.max(0, Math.round(Number(analysis.match_rate) || 0)));

  const { data: updated, error: updateError } = await db
    .from('job_suggestions')
    .update({ match_rate: matchRate })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return updated;
});
