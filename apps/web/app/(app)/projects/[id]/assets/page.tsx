import { ProjectAssetsView } from '@/components/projects/ProjectAssetsView'

export default async function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectAssetsView projectId={id} />
}
