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

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, company, position, job_description, match_breakdown')
    .eq('id', id)
    .single();

  if (fetchError || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  const anthropic = useAnthropic();
  const resumeText = await getResumeForPrompt();

  const matchContext = app.match_breakdown
    ? `\nMatch analysis summary: ${app.match_breakdown.summary || 'N/A'}\nStrong matches: ${(app.match_breakdown.strongMatches || []).join(', ') || 'N/A'}\nGaps: ${(app.match_breakdown.gaps || []).join(', ') || 'N/A'}`
    : '';

  const systemPrompt = `You are Giancarlo Papa writing a motivational letter in the FIRST PERSON (I, my, me) to the hiring manager at ${app.company}.

Position: ${app.position} at ${app.company}
Tone: ${tone}${matchContext}${instructions ? `\nAdditional instructions: ${instructions}` : ''}

STRUCTURE — exactly 3 paragraphs:

Paragraph 1 — VALUE (3–4 sentences max)
Lead with THEIR problem, not my background. Open by naming the specific challenge this company or role faces — from the job description. Then connect ONE capability I have to that problem. The formula: [their challenge] → [one thing I bring] → [concrete outcome for them]. Do not open with "I've built", "I have", "With my", "My X years". Do not list multiple skills, tools, or experiences in this paragraph — pick the single strongest one and cut everything else.

Paragraph 2 — MOTIVATION (3–4 sentences max)
Why this company and this position, not just any job? Show I've thought about what they do, their context, their challenges. Connect one specific experience of mine to their specific situation. This should feel personal, not generic.

Paragraph 3 — CLOSE (1 sentence)
One direct, human sentence inviting a conversation. No buzzwords. Something a real person would actually say.

ABSOLUTE RULES:
- First person only (I, my, me). Never "the candidate" or "you have".
- BANNED openers: "I've built", "I have", "With my", "My X years", "I am writing to", "I am excited to apply", "with great interest", and all variations.
- NEVER use "coupled with", "alongside", "as well as", "in addition to" — these words signal credential-stacking. If you write them, stop and delete the second item.
- NEVER list technologies, job titles, or company names from the resume.
- Year counts (e.g. "13 years") are only allowed if they stand alone making a single point — never next to other credentials.
- One strong argument beats five weak ones. If Para 1 makes more than one point, it is wrong.

Output only the letter body — no salutation, no sign-off, no subject line, no JSON, no markdown.`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.9,
      messages: [{
        role: 'user',
        content: `Candidate resume:\n${resumeText}\n\n---\n\nJob description:\n${app.job_description || '(not provided)'}\n\n---\n\nGenerate a unique version. Vary the opening hook, structure, and which experiences you emphasize. Version seed: ${Date.now()}`
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

  // Determine next version number
  const { data: existing } = await db
    .from('cover_letters')
    .select('version')
    .eq('application_id', id)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const { data: letter, error: insertError } = await db
    .from('cover_letters')
    .insert({
      application_id: Number(id),
      version: nextVersion,
      content: textBlock.text.trim(),
      tone
    })
    .select()
    .single();

  if (insertError) {
    throw createError({ statusCode: 500, message: insertError.message });
  }

  return letter;
});
