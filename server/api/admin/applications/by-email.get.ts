export default defineEventHandler(async (event) => {
  const { email } = getQuery(event);

  if (!email || typeof email !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing email query parameter.' });
  }

  const db = useSupabaseServer();

  const { data, error } = await db
    .from('job_applications')
    .select('id, company, position, status, match_rate, contact_email, created_at')
    .eq('contact_email', email)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
