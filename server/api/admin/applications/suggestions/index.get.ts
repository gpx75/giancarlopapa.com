import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Filters (all optional, all combinable):
 * - status:        'new' | 'reviewing' | 'dismissed' | 'all' (default: new+reviewing, excludes dismissed & snoozed)
 * - source:        substring match on source column
 * - min_score:     integer 0-100, returns rows with match_rate >= value
 * - unanalyzed:    'only' to return rows where match_rate IS NULL
 * - snoozed:       'only' = only snoozed; 'include' = include snoozed in results; default = exclude snoozed
 * - search:        substring across title/company
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const status = typeof q.status === 'string' ? q.status : undefined;
  const source = typeof q.source === 'string' ? q.source : undefined;
  const search = typeof q.search === 'string' ? q.search.trim() : undefined;
  const minScore =
    typeof q.min_score === 'string' ? Number(q.min_score) : undefined;
  const unanalyzed = q.unanalyzed === 'only';
  const snoozed = typeof q.snoozed === 'string' ? q.snoozed : undefined;

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;
  const nowIso = new Date().toISOString();

  function buildQuery(withPublishedAt: boolean) {
    let query = db.from('job_suggestions').select('*');

    if (withPublishedAt) {
      query = query.order('published_at', {
        ascending: false,
        nullsFirst: false
      });
    }
    query = query.order('created_at', { ascending: false });

    // Status filter
    if (status === 'all') {
      // no status filter
    } else if (status === 'dismissed') {
      query = query.eq('status', 'dismissed');
    } else if (status && status !== 'active') {
      query = query.eq('status', status);
    } else {
      // default: active = new + reviewing, exclude dismissed
      query = query.in('status', ['new', 'reviewing']);
    }

    // Snooze handling
    if (snoozed === 'only') {
      query = query.gt('snoozed_until', nowIso);
    } else if (snoozed === 'include') {
      // no snooze filter
    } else {
      // default: exclude snoozed (snoozed_until is null OR in the past)
      query = query.or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`);
    }

    if (source) query = query.ilike('source', `%${source}%`);
    if (search)
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
    if (Number.isFinite(minScore))
      query = query.gte('match_rate', minScore as number);
    if (unanalyzed) query = query.is('match_rate', null);

    return query;
  }

  // Try with published_at ordering; fall back if column doesn't exist yet
  let { data, error } = await buildQuery(true);
  if (error?.message?.includes('published_at')) {
    ({ data, error } = await buildQuery(false));
  }

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});
