import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  const allowed = [
    'company', 'position', 'url', 'location', 'work_model',
    'status', 'priority', 'salary_range', 'notes', 'contact_email',
    'job_description', 'applied_at', 'interviewed_at', 'decided_at'
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('job_applications')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
