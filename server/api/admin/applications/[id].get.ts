import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const [appResult, lettersResult] = await Promise.all([
    db.from('job_applications').select('*').eq('id', id).single(),
    db.from('cover_letters').select('*').eq('application_id', id).order('version', { ascending: false })
  ]);

  if (appResult.error) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  if (lettersResult.error) {
    throw createError({ statusCode: 500, message: lettersResult.error.message });
  }

  return {
    ...appResult.data,
    cover_letters: lettersResult.data
  };
});
