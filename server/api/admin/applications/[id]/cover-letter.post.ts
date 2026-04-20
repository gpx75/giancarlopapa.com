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

  const systemPrompt = `You are writing a cover letter in the FIRST PERSON as Giancarlo Papa applying for ${app.position} at ${app.company}.

Tone: ${tone}${matchContext}${instructions ? `\nAdditional instructions: ${instructions}` : ''}

CORE PRINCIPLE: A good cover letter is about THEM, not you. Every sentence must answer "why does this matter to ${app.company}?" not "look what I did."

STRUCTURE — 3 short paragraphs, under 300 words total:

Paragraph 1 — THEIR PROBLEM (2–3 sentences)
Read the job description carefully. What is the specific challenge or need ${app.company} is hiring to solve? Open by naming that challenge directly. Then state — in one sentence — the ONE thing I bring that addresses it. Not a list. One thing. End the paragraph there.

Paragraph 2 — PROOF (3–4 sentences)
Show, don't tell. Pick ONE past situation where I solved a problem similar to theirs. Describe the situation and the concrete outcome. This is the evidence for the claim made in paragraph 1. Do not list multiple projects or technologies — go deep on one, not wide on many.

Paragraph 3 — CLOSE (1–2 sentences)
Why specifically ${app.company} and not just any company? One genuine sentence. Then one direct sentence inviting a conversation — something a real person would say, not a corporate sign-off.

HARD RULES — violating any of these makes the letter wrong:
- NEVER open with: "I've built", "I have", "With my", "My X years", "I am writing", "I am excited", "with great interest", or any variation that starts with talking about yourself
- NEVER list more than one technology, skill, or experience in a single sentence
- NEVER use: "coupled with", "alongside", "as well as", "in addition to", "furthermore", "moreover"
- NEVER repeat facts from the resume — connect dots, don't recite them
- NEVER use buzzwords: "leverage", "synergy", "passionate", "dynamic", "results-driven", "proven track record"
- Under 300 words total
- First person only (I, my, me)

Output only the letter body — no salutation, no sign-off, no subject line, no JSON, no markdown.`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-sonnet-4-5-20251001',
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
