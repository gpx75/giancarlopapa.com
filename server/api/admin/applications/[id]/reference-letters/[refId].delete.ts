import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  const refId = Number(getRouterParam(event, 'refId'));
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(refId) || refId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid id.' });
  }
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const { error } = await db
    .from('application_reference_letters')
    .delete()
    .eq('id', refId)
    .eq('application_id', id);
  if (error) throw createError({ statusCode: 500, message: error.message });
  return { deleted: true };
});
