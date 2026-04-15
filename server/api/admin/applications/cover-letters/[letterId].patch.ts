export default defineEventHandler(async (event) => {
  const letterId = getRouterParam(event, 'letterId');
  const body = await readBody(event);

  const allowed = ['content', 'tone', 'is_sent'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update.' });
  }

  const db = useSupabaseServer();
  const { data, error } = await db
    .from('cover_letters')
    .update(update)
    .eq('id', letterId)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
