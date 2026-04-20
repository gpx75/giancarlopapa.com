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

CORE PRINCIPLES:
1. About THEM, not you. Every sentence answers "why does this matter to ${app.company}?" — not "look what I did."
2. So specific to ${app.company} and this role it could NOT be recycled for any other application.
3. Written the way two people who respect each other's time would talk — conversational, direct, no corporate language.
4. Show you understand the recruiter's pressure: they need to find the right person fast. Make their decision easy.
5. Under 200 words. Every sentence must earn its place.

STRUCTURE — 3 short paragraphs:

Paragraph 1 — THEIR PROBLEM (2–3 sentences)
What specific challenge is ${app.company} hiring to solve? Name it plainly. Then one sentence: the single thing I bring that addresses it directly. Nothing else. Do not open with anything about my background.

Paragraph 2 — PROOF + WORKING STYLE (3–4 sentences)
One concrete situation from my past that mirrors their challenge. What I did, what the outcome was — specific, not vague. End with one sentence that shows what it's actually like to work with me: how I think, how I operate, how I make the team around me better.

Paragraph 3 — CLOSE (2 sentences)
Why specifically ${app.company} — something genuine and observable about what they're building or the problem they're solving. Then one direct sentence inviting a conversation, like a real person would say it.

HARD RULES:
- NEVER open with: "I've built", "I have", "I've spent", "With my", "My X years", "I am writing", "I am excited", "with great interest"
- NEVER list more than one skill, tool, or project per sentence
- NEVER use: "coupled with", "alongside", "as well as", "in addition to", "furthermore"
- NEVER use: "leverage", "synergy", "passionate", "dynamic", "results-driven", "proven track record", "hard worker"
- NEVER repeat resume facts — connect dots, don't recite them
- NO jargon, NO corporate language — write like a human
- First person only (I, my, me)

---

EXAMPLE — study this carefully. This is what a good letter looks like. The role and candidate are different from Giancarlo's, but the STRUCTURE and VOICE are exactly right. Do not copy it — use it as a model.

Role: Backend Engineer at a fintech startup building payment infrastructure.

"Payment infrastructure fails silently — until it doesn't. When it does, you lose money and trust at the same time, and the engineer who's on-call at 3am needs to know what to touch and what not to. That's the kind of problem I've been hired to solve.

At my last company, we processed €2M daily through a settlement pipeline I owned end-to-end. A regulatory deadline forced a complete rewrite of the reconciliation logic in six weeks. We shipped it without a production incident — not because we were lucky, but because I'd designed the system to be rolled back in ten minutes if anything went wrong. The way I work: I'd rather slow down to make something reversible than move fast and make it permanent.

[Company] is at the stage where the infrastructure decisions you make this year will either compound or constrain you for the next five. I'd like to talk about whether my approach to those decisions is what you're looking for."

Note what this example does: paragraph 1 names their fear, not the candidate's experience. Paragraph 2 has one story, one outcome, one sentence about working style. Paragraph 3 is specific to the company's stage and ends like a real person talking.

---

Output only the letter body — no salutation, no sign-off, no subject line, no JSON, no markdown.`;

  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.6,
      messages: [{
        role: 'user',
        content: `Candidate resume:\n${resumeText}\n\n---\n\nJob description:\n${app.job_description || '(not provided)'}\n\n---\n\nWrite the cover letter now. Follow the structure and voice of the example exactly. Start paragraph 1 by naming ${app.company}'s specific challenge — not Giancarlo's background.`
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
