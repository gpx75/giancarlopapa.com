export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.company || !body.position) {
    throw createError({ statusCode: 400, message: 'Company and position are required.' });
  }

  const allowed = ['company', 'position', 'url', 'location', 'work_model', 'job_description', 'salary_range', 'notes', 'contact_email'];
  const insert: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) insert[key] = body[key];
  }

  const db = useSupabaseServer();
  const { data, error } = await db
    .from('job_applications')
    .insert(insert)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
