import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Return the workflow audit trail for an application (most recent first). */
export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id');
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data, error } = await db
    .from('application_workflow_history')
    .select('id, stage, action, meta, created_at')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data ?? [];
});
