import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getJobProvider } from '~~/server/utils/job-sources/registry';
import { genericFetchDescription } from '~~/server/utils/generic-job-description';

/**
 * Re-scrape the full job description from the suggestion's source URL.
 * Useful when the original import only captured a metadata stub (e.g. older
 * SwissDevJobs imports that pre-date detail-page scraping).
 *
 * Strategy:
 *   1. If the source provider implements `refreshDescription`, call it.
 *   2. Otherwise fall back to a generic HTML-to-text extraction.
 */
export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id');
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid suggestion id.' });
  }

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data: suggestion, error: fetchError } = await db
    .from('job_suggestions')
    .select('id, url, source')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    throw createError({ statusCode: 404, message: 'Suggestion not found.' });
  }
  if (!suggestion.url) {
    throw createError({
      statusCode: 400,
      message: 'Suggestion has no URL to refresh from.'
    });
  }

  let description = '';
  const provider = getJobProvider(suggestion.source);
  if (provider?.refreshDescription) {
    description = await provider.refreshDescription(suggestion.url);
  }
  if (!description.trim()) {
    // Provider didn't have a refresher, or it returned empty (e.g. the URL
    // points to an external ATS that the provider can't parse). Fall back
    // to the generic HTML-to-text extractor.
    description = await genericFetchDescription(suggestion.url);
  }

  if (!description.trim()) {
    throw createError({
      statusCode: 502,
      message: 'Could not extract a description from the source page.'
    });
  }

  const { data: updated, error: updateError } = await db
    .from('job_suggestions')
    .update({ description })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }
  return updated;
});
