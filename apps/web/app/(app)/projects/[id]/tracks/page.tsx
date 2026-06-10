import { TrackList } from '@/components/tracks/TrackList'

export default async function TracksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 max-w-3xl mx-auto">
      <TrackList projectId={id} />
    </div>
  )
}
