import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }
  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('application_reference_letters')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: false });
  if (error) throw createError({ statusCode: 500, message: error.message });
  return data;
});
