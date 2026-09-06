import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const [
    { data: contacts, error: contactsError },
    { data: inbox, error: inboxError },
    { data: applications, error: applicationsError },
    { data: suggestions, error: suggestionsError }
  ] = await Promise.all([
    db.from('contact_submissions').select('status'),
    db.from('inbox_messages').select('unread').eq('archived', false),
    db.from('job_applications').select('status, match_rate').is('deleted_at', null),
    db.from('job_suggestions').select('status, match_rate')
  ]);

  if (contactsError) throw createError({ statusCode: 500, message: contactsError.message });
  if (inboxError) throw createError({ statusCode: 500, message: inboxError.message });
  if (applicationsError) throw createError({ statusCode: 500, message: applicationsError.message });
  if (suggestionsError) throw createError({ statusCode: 500, message: suggestionsError.message });

  const contactRows = (contacts ?? []) as { status: string }[];
  const inboxRows = (inbox ?? []) as { unread: boolean }[];
  const appRows = (applications ?? []) as { status: string; match_rate: number | null }[];
  const suggRows = (suggestions ?? []) as { status: string; match_rate: number | null }[];

  const total = contactRows.length;
  const newLeads = contactRows.filter(r => r.status === 'new').length;
  const responded = contactRows.filter(r => r.status === 'responded').length;
  const unreadInbox = inboxRows.filter(m => m.unread).length;

  const inactiveStatuses = ['rejected', 'withdrawn', 'accepted'];
  const activeApplications = appRows.filter(a => !inactiveStatuses.includes(a.status)).length;

  const pipeline = {
    saved: appRows.filter(a => a.status === 'saved').length,
    applied: appRows.filter(a => a.status === 'applied').length,
    interviewing: appRows.filter(a => a.status === 'interviewing').length,
    offered: appRows.filter(a => a.status === 'offered').length,
    accepted: appRows.filter(a => a.status === 'accepted').length,
    rejected: appRows.filter(a => a.status === 'rejected').length,
    withdrawn: appRows.filter(a => a.status === 'withdrawn').length
  };

  const analyzed = appRows.filter(a => a.match_rate != null);
  const matchDistribution = {
    high: analyzed.filter(a => (a.match_rate ?? 0) >= 70).length,
    medium: analyzed.filter(a => (a.match_rate ?? 0) >= 40 && (a.match_rate ?? 0) < 70).length,
    low: analyzed.filter(a => (a.match_rate ?? 0) < 40).length,
    total: analyzed.length,
    totalApplications: appRows.length
  };

  const newSuggestions = suggRows.filter(s => s.status === 'new').length;
  const highMatchSuggestions = suggRows.filter(s => s.status === 'new' && (s.match_rate ?? 0) >= 70).length;

  return {
    total,
    new: newLeads,
    responded,
    unreadInbox,
    activeApplications,
    pipeline,
    matchDistribution,
    newSuggestions,
    highMatchSuggestions
  };
});
