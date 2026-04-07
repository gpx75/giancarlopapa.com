export default defineEventHandler(async () => {
  const db = useSupabaseServer();

  const { data, error } = await db
    .from('inbox_messages')
    .select('id, uid, subject, from_name, from_email, body_text, body_html, received_at, unread, starred, archived')
    .eq('archived', false)
    .order('received_at', { ascending: false });

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
