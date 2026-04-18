import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Find an existing job application that matches by URL (most reliable)
 * or by company + position (case-insensitive, trimmed).
 *
 * Returns the existing row (id + match_rate) or null if none found.
 */
export async function findExistingApplication(
  db: SupabaseClient,
  input: { company?: string | null; position?: string | null; url?: string | null }
): Promise<{ id: number; match_rate: number | null } | null> {
  const url = input.url?.trim();
  const company = input.company?.trim();
  const position = input.position?.trim();

  // 1. Match by URL first — most reliable signal
  if (url) {
    const { data } = await db
      .from('job_applications')
      .select('id, match_rate')
      .eq('url', url)
      .limit(1)
      .maybeSingle();
    if (data) return data as { id: number; match_rate: number | null };
  }

  // 2. Fall back to company + position (case-insensitive)
  if (company && position) {
    const { data } = await db
      .from('job_applications')
      .select('id, match_rate')
      .ilike('company', company)
      .ilike('position', position)
      .limit(1)
      .maybeSingle();
    if (data) return data as { id: number; match_rate: number | null };
  }

  return null;
}

/**
 * If the incoming match_rate is higher than the existing row's match_rate,
 * update it. Returns the resulting row.
 */
export async function upgradeMatchRateIfHigher(
  db: SupabaseClient,
  existingId: number,
  existingRate: number | null,
  newRate: number | null | undefined
): Promise<void> {
  if (newRate == null) return;
  if (existingRate != null && newRate <= existingRate) return;

  await db
    .from('job_applications')
    .update({ match_rate: newRate })
    .eq('id', existingId);
}
