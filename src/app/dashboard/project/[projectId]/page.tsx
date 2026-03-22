import { redirect } from "next/navigation"

export default async function ProjectDefaultPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  redirect(`/dashboard/project/${projectId}/description`)
}
