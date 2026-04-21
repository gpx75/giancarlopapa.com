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

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const [appResult, lettersResult] = await Promise.all([
    db.from('job_applications').select('*').eq('id', numericId).is('deleted_at', null).single(),
    db.from('cover_letters').select('*').eq('application_id', numericId).order('version', { ascending: false })
  ]);

  if (appResult.error) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  if (lettersResult.error) {
    throw createError({ statusCode: 500, message: lettersResult.error.message });
  }

  return {
    ...appResult.data,
    workflow: normalizeWorkflow(appResult.data.workflow),
    cover_letters: lettersResult.data
  };
});
