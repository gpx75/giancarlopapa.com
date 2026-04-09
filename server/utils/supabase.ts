import { createClient } from '@supabase/supabase-js';

export function useSupabaseServer() {
  const config = useRuntimeConfig();
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
}
