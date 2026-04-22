import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pipeline analytics — aggregates across all (non-deleted) applications.
 *
 * Returns counts/funnel by current_stage + status, time-in-stage averages
 * derived from application_workflow_history, win rate, and source effectiveness
 * (joined back through the originating job_suggestion when promoted).
 */

type StageKey =
  | 'analyze'
  | 'prioritize'
  | 'cv'
  | 'cover_letter'
  | 'review'
  | 'apply'
  | 'interview_prep'
  | 'closed';

const STAGES: StageKey[] = [
  'analyze',
  'prioritize',
  'cv',
  'cover_letter',
  'review',
  'apply',
  'interview_prep',
  'closed'
];

interface AppRow {
  id: number;
  company: string;
  status: string;
  source: string | null;
  created_at: string;
  applied_at: string | null;
  decided_at: string | null;
  workflow: { current_stage?: string } | null;
  match_rate: number | null;
}

interface HistoryRow {
  application_id: number;
  stage: string;
  action: string;
  created_at: string;
}

export default defineEventHandler(async (event) => {
  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const [appsRes, historyRes] = await Promise.all([
    db
      .from('job_applications')
      .select(
        'id, company, status, source, created_at, applied_at, decided_at, workflow, match_rate'
      )
      .is('deleted_at', null),
    db
      .from('application_workflow_history')
      .select('application_id, stage, action, created_at')
      .order('created_at', { ascending: true })
  ]);

  if (appsRes.error)
    throw createError({ statusCode: 500, message: appsRes.error.message });
  if (historyRes.error)
    throw createError({ statusCode: 500, message: historyRes.error.message });

  const apps = (appsRes.data as AppRow[] | null) ?? [];
  const history = (historyRes.data as HistoryRow[] | null) ?? [];

  // ---- Stage funnel: current count per stage --------------------------
  const stageCounts: Record<StageKey, number> = {
    analyze: 0,
    prioritize: 0,
    cv: 0,
    cover_letter: 0,
    review: 0,
    apply: 0,
    interview_prep: 0,
    closed: 0
  };
  for (const a of apps) {
    let stage = a.workflow?.current_stage ?? 'analyze';
    if (stage === 'sent') stage = 'interview_prep'; // legacy normalization
    if ((STAGES as string[]).includes(stage)) {
      stageCounts[stage as StageKey]++;
    }
  }

  // ---- Status breakdown ----------------------------------------------
  const statusCounts: Record<string, number> = {};
  for (const a of apps) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  }

  // ---- Time-in-stage averages (ms) -----------------------------------
  // For each app, walk its history events and accumulate time spent on each
  // stage (delta between consecutive events; tail = now if not yet exited).
  const stageDurations: Record<StageKey, number[]> = {
    analyze: [],
    prioritize: [],
    cv: [],
    cover_letter: [],
    review: [],
    apply: [],
    interview_prep: [],
    closed: []
  };
  const byApp = new Map<number, HistoryRow[]>();
  for (const h of history) {
    const list = byApp.get(h.application_id) ?? [];
    list.push(h);
    byApp.set(h.application_id, list);
  }
  const now = Date.now();
  for (const [, events] of byApp) {
    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      if (ev.action !== 'enter') continue;
      const next = events
        .slice(i + 1)
        .find((e) => e.action === 'enter' || e.action === 'complete');
      const start = new Date(ev.created_at).getTime();
      const end = next ? new Date(next.created_at).getTime() : now;
      if ((STAGES as string[]).includes(ev.stage)) {
        stageDurations[ev.stage as StageKey].push(end - start);
      }
    }
  }
  const stageAvgMs: Record<StageKey, number | null> = {
    analyze: null,
    prioritize: null,
    cv: null,
    cover_letter: null,
    review: null,
    apply: null,
    interview_prep: null,
    closed: null
  };
  for (const s of STAGES) {
    const arr = stageDurations[s];
    stageAvgMs[s] = arr.length
      ? arr.reduce((acc, n) => acc + n, 0) / arr.length
      : null;
  }

  // ---- Win rate (offers / decided) -----------------------------------
  const decided = apps.filter((a) => a.decided_at);
  const offers = apps.filter(
    (a) => a.status === 'offered' || a.status === 'accepted'
  ).length;
  const winRate = decided.length
    ? Math.round((offers / decided.length) * 100)
    : null;

  // ---- Source effectiveness ------------------------------------------
  // Bucket each app by `source` (free-text on job_applications row);
  // count totals + offers + avg match_rate.
  const sourceMap = new Map<
    string,
    { total: number; offers: number; rates: number[] }
  >();
  for (const a of apps) {
    const src = (a.source ?? 'manual').trim() || 'manual';
    const bucket = sourceMap.get(src) ?? { total: 0, offers: 0, rates: [] };
    bucket.total++;
    if (a.status === 'offered' || a.status === 'accepted') bucket.offers++;
    if (typeof a.match_rate === 'number') bucket.rates.push(a.match_rate);
    sourceMap.set(src, bucket);
  }
  const sources = Array.from(sourceMap.entries())
    .map(([source, b]) => ({
      source,
      total: b.total,
      offers: b.offers,
      offer_rate: b.total ? Math.round((b.offers / b.total) * 100) : 0,
      avg_match: b.rates.length
        ? Math.round(b.rates.reduce((a, n) => a + n, 0) / b.rates.length)
        : null
    }))
    .sort((a, b) => b.total - a.total);

  // ---- Recent activity (last 30 days, applied / decided counts) ------
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = now - THIRTY_DAYS;
  const recent = {
    created: apps.filter((a) => new Date(a.created_at).getTime() >= cutoff)
      .length,
    applied: apps.filter(
      (a) => a.applied_at && new Date(a.applied_at).getTime() >= cutoff
    ).length,
    decided: apps.filter(
      (a) => a.decided_at && new Date(a.decided_at).getTime() >= cutoff
    ).length
  };

  return {
    total_applications: apps.length,
    stage_counts: stageCounts,
    status_counts: statusCounts,
    stage_avg_ms: stageAvgMs,
    win_rate: winRate,
    decided_count: decided.length,
    offers_count: offers,
    sources,
    recent
  };
});
