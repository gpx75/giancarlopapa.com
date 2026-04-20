import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error } = await db
    .from('job_applications')
    .select('tailored_resume')
    .eq('id', id)
    .single();

  if (error) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  if (app?.tailored_resume) {
    return app.tailored_resume;
  }

  return getResumeJson();
});
