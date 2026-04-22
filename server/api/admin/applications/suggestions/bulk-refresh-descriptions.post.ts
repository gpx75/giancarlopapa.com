import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getJobProvider } from '~~/server/utils/job-sources/registry';
import { genericFetchDescription } from '~~/server/utils/generic-job-description';

/** Same threshold as the import-time enrichment in find-jobs.post.ts. */
const STUB_DESCRIPTION_THRESHOLD = 400;
const REFRESH_CONCURRENCY = 5;

/**
 * Bulk-refresh stub descriptions across all suggestions.
 *
 * Targets every suggestion whose description is null/empty or shorter than
 * STUB_DESCRIPTION_THRESHOLD chars and whose source provider implements
 * refreshDescription(). Runs in bounded parallel and updates each row in
 * place. Returns counts so the UI can report.
 */
export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data: rows, error: fetchError } = await db
    .from('job_suggestions')
    .select('id, url, source, description');

  if (fetchError) {
    throw createError({ statusCode: 500, message: fetchError.message });
  }

  type Row = {
    id: number;
    url: string | null;
    source: string;
    description: string | null;
  };
  const candidates = ((rows as Row[]) ?? []).filter((r) => {
    if (!r.url) return false;
    if ((r.description?.length ?? 0) >= STUB_DESCRIPTION_THRESHOLD)
      return false;
    return true;
  });

  let refreshed = 0;
  let unchanged = 0;
  let failed = 0;

  let cursor = 0;
  async function worker() {
    while (cursor < candidates.length) {
      const row = candidates[cursor++]!;
      if (!row.url) {
        failed++;
        continue;
      }
      try {
        const provider = getJobProvider(row.source);
        let full = '';
        if (provider?.refreshDescription) {
          full = await provider.refreshDescription(row.url);
        }
        if (!full) {
          full = await genericFetchDescription(row.url);
        }
        if (full && full.length > (row.description?.length ?? 0)) {
          const { error: updateError } = await db
            .from('job_suggestions')
            .update({ description: full })
            .eq('id', row.id);
          if (updateError) failed++;
          else refreshed++;
        } else {
          unchanged++;
        }
      } catch {
        failed++;
      }
    }
  }

  await Promise.all(
    Array.from({ length: REFRESH_CONCURRENCY }, () => worker())
  );

  return {
    candidates: candidates.length,
    refreshed,
    unchanged,
    failed,
    total: rows?.length ?? 0
  };
});
