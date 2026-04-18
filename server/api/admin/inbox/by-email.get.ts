import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const { email } = getQuery(event);

  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing email query parameter.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data, error } = await db
    .from('inbox_messages')
    .select('id, uid, subject, from_name, from_email, body_text, received_at, unread, starred, folder')
    .eq('archived', false)
    .eq('from_email', email)
    .order('received_at', { ascending: false })
    .limit(20);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
