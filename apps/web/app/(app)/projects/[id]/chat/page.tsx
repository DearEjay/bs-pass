import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatFeed } from '@/components/chat/ChatFeed'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <ChatFeed
      projectId={id}
      userId={user.id}
      displayName={profile?.display_name ?? 'Someone'}
    />
  )
}
