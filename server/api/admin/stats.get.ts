import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const [{ data: contacts, error: contactsError }, { data: inbox, error: inboxError }, { data: applications, error: applicationsError }] = await Promise.all([
    db.from('contact_submissions').select('status'),
    db.from('inbox_messages').select('unread').eq('archived', false),
    db.from('job_applications').select('status')
  ]);

  if (contactsError) {
    throw createError({ statusCode: 500, message: contactsError.message });
  }

  if (inboxError) {
    throw createError({ statusCode: 500, message: inboxError.message });
  }

  if (applicationsError) {
    throw createError({ statusCode: 500, message: applicationsError.message });
  }

  const contactRows = (contacts ?? []) as { status: string }[];
  const inboxRows = (inbox ?? []) as { unread: boolean }[];
  const applicationRows = (applications ?? []) as { status: string }[];

  const total = contactRows.length;
  const newLeads = contactRows.filter(r => r.status === 'new').length;
  const responded = contactRows.filter(r => r.status === 'responded').length;
  const unreadInbox = inboxRows.filter(m => m.unread).length;

  const inactiveStatuses = ['rejected', 'withdrawn', 'accepted'];
  const activeApplications = applicationRows.filter(a => !inactiveStatuses.includes(a.status)).length;

  return { total, new: newLeads, responded, unreadInbox, activeApplications };
});
