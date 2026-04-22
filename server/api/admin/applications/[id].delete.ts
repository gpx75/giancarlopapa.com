import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;
  const { error } = await db
    .from('job_applications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', numericId)
    .is('deleted_at', null);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { deleted: true };
});
