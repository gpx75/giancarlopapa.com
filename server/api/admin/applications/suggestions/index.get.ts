export default defineEventHandler(async (event) => {
  const { status } = getQuery(event);
  const db = useSupabaseServer();

  function buildQuery(withPublishedAt: boolean) {
    let query = db
      .from('job_suggestions')
      .select('*');

    if (withPublishedAt) {
      query = query.order('published_at', { ascending: false, nullsFirst: false });
    }
    query = query.order('created_at', { ascending: false });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['new', 'reviewing']);
    }

    return query;
  }

  // Try with published_at ordering; fall back if column doesn't exist yet
  let { data, error } = await buildQuery(true);
  if (error?.message?.includes('published_at')) {
    ({ data, error } = await buildQuery(false));
  }

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
