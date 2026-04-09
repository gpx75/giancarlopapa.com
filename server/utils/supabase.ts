import { createClient } from '@supabase/supabase-js';

export function useSupabaseServer() {
  // Read directly from process.env so the Vercel Supabase integration
  // (which injects SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY without the
  // NUXT_ prefix Nitro expects for runtimeConfig overrides) is the
  // single source of truth.
  const url
    = process.env.SUPABASE_URL
    || process.env.NUXT_PUBLIC_SUPABASE_URL
    || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key) {
    throw createError({
      statusCode: 503,
      message: 'Supabase not configured.'
    });
  }

  return createClient(url, key);
}
