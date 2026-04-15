export default defineEventHandler(async (event) => {
  const { status } = getQuery(event);
  const db = useSupabaseServer();

  let query = db
    .from('job_applications')
    .select('id, company, position, url, location, work_model, status, match_rate, match_breakdown, job_description, salary_range, notes, contact_email, applied_at, interviewed_at, decided_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (status && typeof status === 'string') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
