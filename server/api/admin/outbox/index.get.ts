import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data, error } = await db
    .from('outbox')
    .select('id, sent_at, to_email, subject, resend_message_id, attachments, application_id, job_applications(company, position)')
    .order('sent_at', { ascending: false });

  if (error) throw createError({ statusCode: 500, message: error.message });
  return data;
});
