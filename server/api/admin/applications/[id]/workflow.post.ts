import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationWorkflow, WorkflowTransitionPayload } from '~/types/applications';
import { applyTransition, normalizeWorkflow } from '~~/server/utils/workflow';

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id');
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const body = await readBody<WorkflowTransitionPayload>(event);
  if (!body || typeof body !== 'object' || !body.stage || !body.action) {
    throw createError({ statusCode: 400, message: 'Missing stage or action.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error: fetchError } = await db
    .from('job_applications')
    .select('id, workflow')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (fetchError || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  let next: ApplicationWorkflow;
  try {
    next = applyTransition(normalizeWorkflow(app.workflow), body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid workflow transition.';
    throw createError({ statusCode: 409, message: msg });
  }

  const { data: updated, error: updateError } = await db
    .from('job_applications')
    .update({ workflow: next })
    .eq('id', id)
    .select('id, workflow')
    .single();

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  // Best-effort audit log; never blocks the transition response.
  await db.from('application_workflow_history').insert({
    application_id: id,
    stage: body.stage,
    action: body.action,
    meta: body.meta ?? null
  });

  return updated;
});
