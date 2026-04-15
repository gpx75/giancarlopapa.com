export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing suggestion ID.' });
  }

  const db = useSupabaseServer();

  const { data: suggestion, error: fetchError } = await db
    .from('job_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }

  // Create application from suggestion
  const { data: app, error: insertError } = await db
    .from('job_applications')
    .insert({
      company: suggestion.company,
      position: suggestion.title,
      url: suggestion.url,
      location: suggestion.location,
      job_description: suggestion.description,
      match_rate: suggestion.match_rate
    })
    .select()
    .single();

  if (insertError) {
    throw createError({ statusCode: 500, message: insertError.message });
  }

  // Remove suggestion from feed after promotion
  await db
    .from('job_suggestions')
    .delete()
    .eq('id', id);

  return app;
});
