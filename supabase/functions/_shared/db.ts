import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

let _db: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (!_db) {
    _db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
  }
  return _db
}
