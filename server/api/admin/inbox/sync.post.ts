export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  if (!config.gmail.user || !config.gmail.appPassword) {
    throw createError({ statusCode: 503, message: 'Gmail IMAP not configured.' });
  }

  const toDomain = config.contactEmail?.split('@')[1]?.trim() || undefined;

  const messages = await fetchImapMessages(
    {
      host: 'imap.gmail.com',
      user: config.gmail.user,
      pass: config.gmail.appPassword
    },
    { toDomain }
  );

  if (messages.length === 0) {
    return { synced: 0 };
  }

  const db = useSupabaseServer();

  const rows = messages.map(m => ({
    id: m.id,
    uid: m.uid,
    subject: m.subject,
    from_name: m.fromName,
    from_email: m.fromEmail,
    body_text: m.bodyText,
    body_html: m.bodyHtml,
    received_at: m.receivedAt,
    folder: 'INBOX'
  }));

  const { error } = await db
    .from('inbox_messages')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { synced: rows.length };
});
