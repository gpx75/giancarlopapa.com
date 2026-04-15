export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const db = useSupabaseServer();

  const { data, error } = await db
    .from('cover_letters')
    .select('*')
    .eq('application_id', id)
    .order('version', { ascending: false });

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
