import { TrackList } from '@/components/tracks/TrackList'

export default async function TracksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <TrackList projectId={id} />
    </div>
  )
}
