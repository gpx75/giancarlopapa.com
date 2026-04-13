export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  const missing: string[] = [];
  if (!config.gmail.user) missing.push('NUXT_GMAIL_USER');
  if (!config.gmail.appPassword) missing.push('NUXT_GMAIL_APP_PASSWORD');
  if (missing.length > 0) {
    throw createError({
      statusCode: 503,
      message: `Gmail IMAP not configured — missing: ${missing.join(', ')}`
    });
  }

  const toDomain = config.contactEmail?.split('@')[1]?.trim() || undefined;

  const conn = {
    host: 'imap.gmail.com',
    user: config.gmail.user,
    pass: config.gmail.appPassword
  };

  const [inboxMessages, sentMessages] = await Promise.all([
    fetchImapMessages(conn, { toDomain, folder: 'INBOX' }),
    fetchImapMessages(conn, { fromDomain: toDomain, folder: '[Gmail]/Sent Mail' })
  ]);

  const messages = [...inboxMessages, ...sentMessages];

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
    folder: m.folder
  }));

  const { error } = await db
    .from('inbox_messages')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { synced: rows.length };
});
