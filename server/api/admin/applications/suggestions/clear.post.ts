export default defineEventHandler(async () => {
  const db = useSupabaseServer();

  // Clear all pending suggestions (promoted ones are already deleted)
  const { count, error } = await db
    .from('job_suggestions')
    .delete({ count: 'exact' })
    .in('status', ['new', 'reviewing', 'dismissed']);

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to clear suggestions' });
  }

  return { cleared: count ?? 0 };
});
