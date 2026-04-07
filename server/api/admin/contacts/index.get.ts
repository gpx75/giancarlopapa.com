export default defineEventHandler(async () => {
  const db = useSupabaseServer();

  const { data, error } = await db
    .from('contact_submissions')
    .select('id, name, email, message, status, notes, resend_contact_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
