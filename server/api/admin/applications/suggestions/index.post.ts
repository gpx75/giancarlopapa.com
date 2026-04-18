import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.title || !body.company) {
    throw createError({ statusCode: 400, message: 'Title and company are required.' });
  }

  const allowed = ['title', 'company', 'url', 'location', 'description', 'source'];
  const insert: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) insert[key] = body[key];
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('job_suggestions')
    .insert(insert)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
