import { CollaboratorList } from '@/components/collaborators/CollaboratorList'

export default async function CollaboratorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CollaboratorList projectId={id} />
}
