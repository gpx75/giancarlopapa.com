import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Destructive: deletes ALL rows from `inbox_messages`. Used to wipe stale
 * rows so a fresh Gmail-filtered sync can repopulate the table cleanly.
 * Owner-only via server/middleware/admin.ts, which guards every
 * `/api/admin/*` route (and skips auth in local dev, like all admin APIs).
 */
export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  // Supabase requires a filter on delete() — use a condition that matches
  // every row. `neq('id', '')` is the conventional "delete all" pattern.
  const { error, count } = await db
    .from('inbox_messages')
    .delete({ count: 'exact' })
    .neq('id', '');

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { purged: count ?? 0 };
});
