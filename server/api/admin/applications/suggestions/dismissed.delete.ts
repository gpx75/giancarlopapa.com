import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { count, error } = await db
    .from('job_suggestions')
    .delete({ count: 'exact' })
    .eq('status', 'dismissed');

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { deleted: count ?? 0 };
});
