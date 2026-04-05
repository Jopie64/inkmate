import { auth } from "@/auth"
import { getProjectAction } from "@/app/actions/projects"
import { ChaptersClient } from "./chapters-client"
import { redirect } from "next/navigation"

export default async function ChaptersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) redirect("/")
  
  const projectInfo = await getProjectAction(projectId)
  
  const chapters = projectInfo?.chapters || []

  return (
    <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden">
      <ChaptersClient projectId={projectId} initialChapters={chapters} />
    </div>
  )
}
