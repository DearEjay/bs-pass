import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export async function requireAuth(req: Request): Promise<{ userId: string; jwt: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response('Unauthorized', { status: 401 })
  }
  const jwt = authHeader.slice(7)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) throw new Response('Unauthorized', { status: 401 })

  return { userId: user.id, jwt }
}
