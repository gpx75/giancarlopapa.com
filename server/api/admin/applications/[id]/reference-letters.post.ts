import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid application id.' });
  }
  const body = await readBody<{ slug: string, label?: string, included?: boolean }>(event);
  if (!body.slug || typeof body.slug !== 'string') {
    throw createError({ statusCode: 400, message: 'slug is required.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('application_reference_letters')
    .upsert({
      application_id: id,
      slug: body.slug,
      label: body.label ?? body.slug,
      included: body.included ?? true
    }, { onConflict: 'application_id,slug' })
    .select()
    .single();
  if (error) throw createError({ statusCode: 500, message: error.message });
  return data;
});
