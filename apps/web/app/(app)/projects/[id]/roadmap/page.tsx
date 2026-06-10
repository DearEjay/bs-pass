import { RoadmapView } from '@/components/roadmap/RoadmapView'

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RoadmapView projectId={id} />
}
