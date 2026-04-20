import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const tone = body.tone || 'professional';
  const instructions = body.instructions || '';
  const isDraft = body.draft === true;
  // Allow saving pre-edited content directly (from draft panel)
  const providedContent: string | undefined = body.content;

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, company, position, job_description, match_breakdown')
    .eq('id', id)
    .single();

  if (fetchError || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  // If caller provides pre-edited content, skip AI generation and go straight to save/draft
  if (providedContent !== undefined) {
    if (isDraft) {
      return { content: providedContent.trim(), tone };
    }
    // Save provided content as a new version
    const { data: existingForSave } = await db
      .from('cover_letters')
      .select('version')
      .eq('application_id', id)
      .order('version', { ascending: false })
      .limit(1);
    const saveVersion = (existingForSave?.[0]?.version ?? 0) + 1;
    const { data: savedLetter, error: saveError } = await db
      .from('cover_letters')
      .insert({ application_id: Number(id), version: saveVersion, content: providedContent.trim(), tone })
      .select()
      .single();
    if (saveError) throw createError({ statusCode: 500, message: saveError.message });
    return savedLetter;
  }

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const matchContext = app.match_breakdown
    ? `\nMatch analysis summary: ${app.match_breakdown.summary || 'N/A'}\nStrong matches: ${(app.match_breakdown.strongMatches || []).join(', ') || 'N/A'}\nGaps: ${(app.match_breakdown.gaps || []).join(', ') || 'N/A'}`
    : '';

  const toneGuide = {
    professional: 'Direct and confident. Short sentences. No small talk. The kind of email a senior engineer writes to a VP — respectful but peer-to-peer, not deferential.',
    conversational: 'Warm and human. Write as if talking to someone you just met at a conference — casual enough to be likeable, sharp enough to be taken seriously. First names feel natural here.',
    formal: 'Measured and precise. Structured sentences, careful word choice. Appropriate for regulated industries or traditional companies. Still clear and human — formal does not mean stiff or verbose.'
  }[tone] || '';

  const systemPrompt = `You are writing a cover letter in the first person for Giancarlo Papa applying for ${app.position} at ${app.company}.${matchContext}${instructions ? `\nAdditional instructions: ${instructions}` : ''}

TONE — ${tone.toUpperCase()}:
${toneGuide}

The opening sentence has already been written. Continue it into a 3-paragraph letter under 200 words. Write entirely in first person ("I", "my", "I've") — Giancarlo is speaking directly.

STRUCTURE:
- Para 1 (2–3 sentences): Name ${app.company}'s specific challenge. One sentence on what I bring to solve it.
- Para 2 (3–4 sentences): One concrete past situation that proves the claim. What happened, what the outcome was. One sentence on how I work.
- Para 3 (2 sentences): Why specifically ${app.company}. A direct human invite to talk.

RULES:
1. First person throughout — "I built", "I led", "I've seen" — never "he" or "you"
2. One skill, tool, or technology per sentence maximum — no lists
3. No buzzwords: leverage, synergy, passionate, dynamic, results-driven, proven track record
4. No CV recitation — interpret experience, don't repeat it
5. Under 200 words total including the opening sentence already written

Output only the letter body. No salutation, no sign-off, no markdown.`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: `Candidate resume:\n${resumeText}\n\n---\n\nJob description:\n${app.job_description || '(not provided)'}`
        },
        {
          role: 'assistant',
          content: `I came across ${app.company}`
        }
      ],
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

  // Determine next version number
  const { data: existing } = await db
    .from('cover_letters')
    .select('version')
    .eq('application_id', id)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const prefill = `I came across ${app.company}`;
  const fullContent = `${prefill}${textBlock.text.trim().startsWith(prefill) ? textBlock.text.trim().slice(prefill.length) : ' ' + textBlock.text.trim()}`;

  // Draft mode: return content without saving to DB
  if (isDraft) {
    return { content: fullContent.trim(), tone };
  }

  const { data: letter, error: insertError } = await db
    .from('cover_letters')
    .insert({
      application_id: Number(id),
      version: nextVersion,
      content: fullContent.trim(),
      tone
    })
    .select()
    .single();

  if (insertError) {
    throw createError({ statusCode: 500, message: insertError.message });
  }

  return letter;
});
