import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const letterId = getRouterParam(event, 'letterId');

  if (!letterId) {
    throw createError({ statusCode: 400, message: 'Missing cover letter ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const { error } = await db
    .from('cover_letters')
    .delete()
    .eq('id', letterId);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { deleted: true };
});
