"use server"

import { auth } from "@/auth"
import { getOctokit, getFileContent, createOrUpdateFile } from "@/lib/github"

export async function getChapterContentAction(projectId: string, chapterId: string) {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return null
  
  const octokit = await getOctokit(session.accessToken as string)
  const fullContent = await getFileContent(octokit, session.user.name, `${projectId}/chapters/${chapterId}/full.md`)
  return fullContent || ""
}

export async function saveChapterAction(projectId: string, title: string, content: string, chapterId?: string) {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) throw new Error("Unauthorized")
  
  const octokit = await getOctokit(session.accessToken as string)
  const uuid = chapterId || crypto.randomUUID()
  
  // 1. Save the actual content
  await createOrUpdateFile(
    octokit, 
    session.user.name, 
    `${projectId}/chapters/${uuid}/full.md`, 
    content, 
    `docs(chapter): update chapter ${uuid}`
  )
  
  // 2. Fetch or initialize index.json to update chapter metadata
  const indexStr = await getFileContent(octokit, session.user.name, `${projectId}/index.json`)
  if (indexStr) {
    const projectIndex = JSON.parse(indexStr)
    const chapterExists = projectIndex.chapters?.find((c: any) => c.id === uuid)
    
    if (chapterExists) {
      if (chapterExists.title !== title) {
        chapterExists.title = title
      }
    } else {
      if (!projectIndex.chapters) projectIndex.chapters = []
      projectIndex.chapters.push({ id: uuid, title })
    }
    
    await createOrUpdateFile(
      octokit,
      session.user.name,
      `${projectId}/index.json`,
      JSON.stringify(projectIndex, null, 2),
      `docs(index): update index.json for chapter ${uuid}`
    )
  }
  
  return uuid
}
