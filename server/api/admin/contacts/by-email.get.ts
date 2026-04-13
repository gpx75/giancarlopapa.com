export default defineEventHandler(async (event) => {
  const { email } = getQuery(event);

  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing email query parameter.' });
  }

  const db = useSupabaseServer();

  const { data, error } = await db
    .from('contact_submissions')
    .select('id, name, email, message, status, created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
