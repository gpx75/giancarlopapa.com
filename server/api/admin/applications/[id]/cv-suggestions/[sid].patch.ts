import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CvSuggestionUpdatePayload } from '~/types/applications';

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id');
  const sidParam = getRouterParam(event, 'sid');
  const id = Number(idParam);
  const sid = Number(sidParam);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !Number.isSafeInteger(sid) ||
    sid <= 0
  ) {
    throw createError({ statusCode: 400, message: 'Invalid id.' });
  }

  const body = await readBody<CvSuggestionUpdatePayload>(event);
  const update: Record<string, unknown> = {};
  if (
    body.status &&
    ['pending', 'applied', 'dismissed'].includes(body.status)
  ) {
    update.status = body.status;
  }
  if (body.applied_note !== undefined) {
    update.applied_note = body.applied_note;
  }
  if (Object.keys(update).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No valid fields to update.'
    });
  }
  update.updated_at = new Date().toISOString();

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data: row, error } = await db
    .from('application_cv_suggestions')
    .update(update)
    .eq('id', sid)
    .eq('application_id', id)
    .select()
    .single();

  if (error || !row) {
    throw createError({
      statusCode: 500,
      message: error?.message ?? 'Update failed.'
    });
  }

  // Recompute counters and persist into workflow.
  const { count: totalCount } = await db
    .from('application_cv_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', id);
  const { count: appliedCount } = await db
    .from('application_cv_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', id)
    .eq('status', 'applied');

  const { data: app } = await db
    .from('job_applications')
    .select('workflow')
    .eq('id', id)
    .single();

  if (app) {
    const next = refreshStageCounters(normalizeWorkflow(app.workflow), {
      cv_total_count: totalCount ?? 0,
      cv_applied_count: appliedCount ?? 0
    });
    await db.from('job_applications').update({ workflow: next }).eq('id', id);
  }

  return row;
});
