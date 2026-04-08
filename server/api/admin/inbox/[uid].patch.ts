export default defineEventHandler(async (event) => {
  const uid = Number(getRouterParam(event, 'uid'));
  const body = await readBody(event);

  const allowed = ['unread', 'starred', 'archived'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update.' });
  }

  const db = useSupabaseServer();
  const { data, error } = await db
    .from('inbox_messages')
    .update(update)
    .eq('uid', uid)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
