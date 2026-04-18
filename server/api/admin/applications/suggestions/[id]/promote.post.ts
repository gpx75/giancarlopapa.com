import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing suggestion ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: suggestion, error: fetchError } = await db
    .from('job_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }

  // Check if this job is already in applications (by URL or company+position).
  // If yes: upgrade match_rate if higher, drop the suggestion, return existing.
  // If no: create a new application and drop the suggestion.
  const existing = await findExistingApplication(db, {
    company: suggestion.company,
    position: suggestion.title,
    url: suggestion.url
  });

  let app;

  if (existing) {
    await upgradeMatchRateIfHigher(db, existing.id, existing.match_rate, suggestion.match_rate);
    const { data: refreshed } = await db
      .from('job_applications')
      .select('*')
      .eq('id', existing.id)
      .single();
    app = refreshed;
  } else {
    const { data: created, error: insertError } = await db
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
    app = created;
  }

  // Remove suggestion from feed after promotion (whether new or duplicate)
  await db
    .from('job_suggestions')
    .delete()
    .eq('id', id);

  return app;
});
