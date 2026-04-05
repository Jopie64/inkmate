"use server"

import { auth } from "@/auth"
import { getOctokit, getFileContent } from "@/lib/github"
import { saveToWorkingDir, getFromWorkingDir } from "@/lib/blob"

export async function getChapterContentAction(projectId: string, chapterId: string, branch: string = "main") {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return null
  const userId = session.user.name
  
  // 1. Try Blob First (Working Copy)
  const workingContent = await getFromWorkingDir(userId, projectId, branch, `chapters/${chapterId}/full.md`)
  if (workingContent !== null) return workingContent
  
  // 2. Fallback to GitHub and seed Blob Working Copy
  const octokit = await getOctokit(session.accessToken as string)
  const remoteContent = await getFileContent(octokit, userId, `${projectId}/chapters/${chapterId}/full.md`)
  
  if (remoteContent !== null) {
    // Seed Blob so next request is fast and it's marked as "local" (though not necessarily dirty)
    // Actually, don't mark as dirty yet if it's just a fetch.
    // getFromWorkingDir currently doesn't distinguish between cached and dirty.
    // I'll just return it and saveToWorkingDir only on save.
    return remoteContent
  }
  
  return ""
}

export async function saveChapterAction(projectId: string, title: string, content: string, chapterId?: string, branch: string = "main") {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) throw new Error("Unauthorized")
  const userId = session.user.name
  
  const uuid = chapterId || crypto.randomUUID()
  
  // 1. Save to Blob Working Dir (Instant)
  await saveToWorkingDir(userId, projectId, branch, `chapters/${uuid}/full.md`, content)
  
  // 2. Update local index.json in Blob Working Dir
  let indexStr = await getFromWorkingDir(userId, projectId, branch, `index.json`)
  
  if (!indexStr) {
    // Fallback: get from GitHub
    const octokit = await getOctokit(session.accessToken as string)
    indexStr = await getFileContent(octokit, userId, `${projectId}/index.json`)
  }
  
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
    
    // Save updated index to Blob
    await saveToWorkingDir(userId, projectId, branch, `index.json`, JSON.stringify(projectIndex, null, 2))
  }
  
  return uuid
}
