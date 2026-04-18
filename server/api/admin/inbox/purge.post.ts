import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

const OWNER_EMAIL = 'giancarlo.papa@gmail.com';

/**
 * Destructive: deletes ALL rows from `inbox_messages`. Used to wipe stale
 * pre-migration iCloud rows so a fresh Gmail-filtered sync can repopulate
 * the table cleanly. Owner-only — we double-check the session here because
 * the global admin middleware only guards `/admin/*` UI routes, not
 * `/api/admin/*`.
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const userEmail = (session?.user as Record<string, unknown> | undefined)?.email as string | undefined;
  if (!userEmail || userEmail !== OWNER_EMAIL) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

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
