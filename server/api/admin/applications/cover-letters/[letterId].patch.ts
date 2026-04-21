import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const letterId = getRouterParam(event, 'letterId');
  const numericId = Number(letterId);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid letter id.' });
  }

  const body = await readBody(event);

  const allowed = ['content', 'tone', 'is_sent', 'is_active'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  // If activating this letter, demote any other active letter on the same application first
  // to avoid colliding with the partial-unique index `(application_id) where is_active`.
  if (update.is_active === true) {
    const { data: existing } = await db
      .from('cover_letters')
      .select('application_id')
      .eq('id', numericId)
      .single();
    if (existing?.application_id) {
      await db
        .from('cover_letters')
        .update({ is_active: false })
        .eq('application_id', existing.application_id)
        .neq('id', numericId);
    }
  }

  const { data, error } = await db
    .from('cover_letters')
    .update(update)
    .eq('id', numericId)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
