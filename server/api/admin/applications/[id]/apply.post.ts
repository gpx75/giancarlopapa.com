import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationWorkflow, ApplyMode } from '~/types/applications';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const body = await readBody<{ mode?: ApplyMode; applied_at?: string }>(event);
  const mode: ApplyMode = body.mode === 'export' ? 'export' : 'send';

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data: app, error } = await db
    .from('job_applications')
    .select('workflow, status')
    .eq('id', numericId)
    .is('deleted_at', null)
    .single();

  if (error || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  const workflow = normalizeWorkflow(app.workflow);

  // applyTransition enforces "Review must be done before Apply complete".
  let next: ApplicationWorkflow;
  try {
    next = applyTransition(workflow, {
      stage: 'apply',
      action: 'complete',
      meta: { mode }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid transition.';
    throw createError({ statusCode: 412, message });
  }

  const update: Record<string, unknown> = {
    workflow: next,
    status: 'applied',
    applied_at: body.applied_at ?? new Date().toISOString()
  };

  const { data: updated, error: updateError } = await db
    .from('job_applications')
    .update(update)
    .eq('id', numericId)
    .select()
    .single();

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return updated;
});
