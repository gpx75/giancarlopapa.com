export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  const allowed = ['status', 'title', 'company', 'url', 'location', 'description', 'source'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update.' });
  }

  const db = useSupabaseServer();
  const { data, error } = await db
    .from('job_suggestions')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
