import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Snooze a suggestion until a given date (ISO string).
 * Body: { until: string | null }   (null clears the snooze)
 */
export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id');
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid suggestion id.' });
  }

  const body = await readBody<{ until?: string | null }>(event);
  const until = body?.until ?? null;

  if (until !== null) {
    const ts = Date.parse(until);
    if (Number.isNaN(ts)) {
      throw createError({ statusCode: 400, message: 'Invalid date.' });
    }
    if (ts <= Date.now()) {
      throw createError({ statusCode: 400, message: 'Snooze date must be in the future.' });
    }
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('job_suggestions')
    .update({ snoozed_until: until })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }
  return data;
});
