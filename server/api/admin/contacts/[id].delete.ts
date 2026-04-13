export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing contact ID.' });
  }

  const db = useSupabaseServer();
  const { error } = await db
    .from('contact_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { deleted: true };
});
