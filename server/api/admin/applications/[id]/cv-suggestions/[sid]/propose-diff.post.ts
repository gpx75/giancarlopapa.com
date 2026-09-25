import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CvEditOp, ProposedCvEdit } from '~/types/applications';

const SYSTEM_PROMPT = [
  'You convert a CV-tailoring suggestion into precise, machine-applicable edits against the resume JSON provided.',
  '',
  'Return a JSON array of edit operations. Each operation is one of:',
  '- {"op": "replace", "path": "<dot/bracket path>", "find": "<exact substring of the CURRENT value at path>", "replace": "<new substring>"}',
  '- {"op": "insert", "path": "<dot/bracket path to an array>", "value": <new array item — string or object matching sibling items\' shape>}',
  '- {"op": "manual", "reason": "<why this cannot be safely auto-applied>"}',
  '',
  'Rules:',
  '- "find" must be copied VERBATIM (exact characters) from the given resume JSON — it will be matched programmatically, not interpreted.',
  '- "path" must reference a field that actually exists in the given resume JSON (e.g. "basics.summary", "work[0].highlights[2]", "skills[3].keywords").',
  '- For "insert", the new item\'s shape must match existing items in that array (a string for a list of highlight strings, an object with the same keys for a list of skill-group or project objects).',
  '- Prefer the smallest edit that fulfils the suggestion. Split unrelated changes into separate operations.',
  '- If the suggestion asks for something that is not a simple text replace or list append (e.g. reordering existing items, restructuring a section), use "manual" instead of guessing.',
  '',
  'Respond with JSON only, no markdown fences.'
].join('\n');

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  const sid = Number(getRouterParam(event, 'sid'));
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !Number.isSafeInteger(sid) ||
    sid <= 0
  ) {
    throw createError({ statusCode: 400, message: 'Invalid id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const [suggestionRes, appRes] = await Promise.all([
    db
      .from('application_cv_suggestions')
      .select('id, section, issue, suggestion, status')
      .eq('id', sid)
      .eq('application_id', id)
      .single(),
    db
      .from('job_applications')
      .select('tailored_resume')
      .eq('id', id)
      .single()
  ]);

  if (suggestionRes.error || !suggestionRes.data) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }
  if (appRes.error || !appRes.data) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  const suggestion = suggestionRes.data;
  const baseResume =
    (appRes.data.tailored_resume as Record<string, unknown> | null) ??
    getResumeJson();

  const anthropic = useAnthropic();
  let response;
  try {
    response = await callAnthropicWithRetry(anthropic, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content:
            `Suggestion to apply (section: ${suggestion.section}):\n${suggestion.suggestion}\n\n` +
            `Current resume JSON:\n${JSON.stringify(baseResume)}`
        }
      ],
      system: SYSTEM_PROMPT
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
    throw createError({ statusCode: 502, message: 'Unexpected AI response.' });
  }

  let ops: CvEditOp[];
  try {
    const parsed = JSON.parse(stripJsonFence(textBlock.text));
    ops = Array.isArray(parsed) ? parsed : [];
  } catch {
    throw createError({ statusCode: 502, message: 'Could not parse AI response.' });
  }

  const { results } = applyCvEdits(baseResume, ops);
  const edits: ProposedCvEdit[] = ops.map((op, i) => ({ op, result: results[i]! }));

  return { edits };
});
