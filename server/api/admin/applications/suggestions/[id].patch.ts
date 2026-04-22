import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  const allowed = [
    'status',
    'title',
    'company',
    'url',
    'location',
    'description',
    'source',
    'dismissed_at',
    'snoozed_until'
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // When status flips to 'dismissed', also stamp dismissed_at (unless caller set it).
  if (body.status === 'dismissed' && !('dismissed_at' in body)) {
    update.dismissed_at = new Date().toISOString();
  }
  // When un-dismissing (status back to 'new'), clear the timestamp.
  if (body.status === 'new' && !('dismissed_at' in body)) {
    update.dismissed_at = null;
  }

  if (Object.keys(update).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No valid fields to update.'
    });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;
  const { data, error } = await db
    .from('job_suggestions')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
