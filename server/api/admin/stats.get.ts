export default defineEventHandler(async () => {
  const db = useSupabaseServer();

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

  const total = contacts.length;
  const newLeads = contacts.filter(r => r.status === 'new').length;
  const responded = contacts.filter(r => r.status === 'responded').length;
  const unreadInbox = inbox.filter(m => m.unread).length;

  const inactiveStatuses = ['rejected', 'withdrawn', 'accepted'];
  const activeApplications = applications.filter(a => !inactiveStatuses.includes(a.status)).length;

  return { total, new: newLeads, responded, unreadInbox, activeApplications };
});
