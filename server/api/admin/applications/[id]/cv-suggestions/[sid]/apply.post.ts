import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import type { ApplyCvEditsResponse, CvEditOp } from '~/types/applications';

const MAX_PAGES = 2;

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

  const body = await readBody<{ edits?: CvEditOp[] }>(event);
  const edits = Array.isArray(body?.edits) ? body.edits : [];
  if (edits.length === 0) {
    throw createError({ statusCode: 400, message: 'No edits to apply.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const appRes = await db
    .from('job_applications')
    .select('tailored_resume, match_breakdown, company, position, workflow')
    .eq('id', id)
    .single();
  if (appRes.error || !appRes.data) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }
  const app = appRes.data;

  const baseResume =
    (app.tailored_resume as Record<string, unknown> | null) ?? getResumeJson();

  // Re-validate against the CURRENT resume — content may have shifted since
  // the client last reviewed the proposed diff.
  const { resume: nextResume, results } = applyCvEdits(baseResume, edits);
  const failed = results.filter((r) => r.status !== 'ok');
  if (failed.length > 0) {
    throw createError({
      statusCode: 409,
      message: `Could not apply: ${failed.map((r) => r.message).join('; ')}`
    });
  }

  const keywords: string[] =
    (app.match_breakdown as { strongMatches?: string[] } | null)
      ?.strongMatches ?? [];
  const html = buildTailoredResumeHtml(
    // ResumeData isn't exported from tailored-resume-html.ts; shape is
    // guaranteed by applyCvEdits, which only mutates an existing valid resume.
    nextResume as unknown as Parameters<typeof buildTailoredResumeHtml>[0],
    keywords,
    (app.company as string) ?? '',
    (app.position as string) ?? ''
  );
  const pdf = await renderPdfWithBorder(html);
  const pageCount = (await PDFDocument.load(pdf)).getPageCount();

  if (pageCount > MAX_PAGES) {
    throw createError({
      statusCode: 422,
      message: `This would grow the tailored resume to ${pageCount} pages (max ${MAX_PAGES}) — not applied.`
    });
  }

  const updateRes = await db
    .from('job_applications')
    .update({ tailored_resume: nextResume })
    .eq('id', id);
  if (updateRes.error) {
    throw createError({ statusCode: 500, message: updateRes.error.message });
  }

  const note = results
    .map((r) => (r.op === 'insert' ? `+ ${r.path}` : `${r.path}: "${r.before}" → "${r.after}"`))
    .join('\n');

  const suggestionRes = await db
    .from('application_cv_suggestions')
    .update({ status: 'applied', applied_note: note, updated_at: new Date().toISOString() })
    .eq('id', sid)
    .eq('application_id', id)
    .select()
    .single();
  if (suggestionRes.error || !suggestionRes.data) {
    throw createError({
      statusCode: 500,
      message: suggestionRes.error?.message ?? 'Could not mark suggestion as applied.'
    });
  }

  const { count: totalCount } = await db
    .from('application_cv_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', id);
  const { count: appliedCount } = await db
    .from('application_cv_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', id)
    .eq('status', 'applied');

  const nextWorkflow = refreshStageCounters(normalizeWorkflow(app.workflow), {
    cv_total_count: totalCount ?? 0,
    cv_applied_count: appliedCount ?? 0
  });
  await db.from('job_applications').update({ workflow: nextWorkflow }).eq('id', id);

  const response: ApplyCvEditsResponse = {
    resume: nextResume,
    pageCount,
    suggestion: suggestionRes.data
  };
  return response;
});
