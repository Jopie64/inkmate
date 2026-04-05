"use server"

import { auth } from "@/auth"
import { getOctokit, listProjects, ensureRepository, getProject } from "@/lib/github"
import { getUserMeta, saveUserMeta, getFromWorkingDir } from "@/lib/blob"
import { revalidatePath } from "next/cache"

export async function getProjectsAction() {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return []
  const userId = session.user.name
  
  // 1. Try Blob Meta First
  const cached = await getUserMeta(userId, 'projects')
  
  // 2. Fallback to GitHub (only if no cache or if we want to refresh? Let's stay in Blob if possible)
  try {
    if (!cached) {
      if (!session.accessToken) return []
      const octokit = await getOctokit(session.accessToken)
      await ensureRepository(octokit, userId)
      const projects = await listProjects(octokit, userId)
      await saveUserMeta(userId, 'projects', projects)
      return projects
    }
  } catch (e) {
    console.error("Failed to fetch projects from GitHub", e)
    // If we have a cache (but for some reason fell through), return it.
    // If not, we'll just return [] below.
  }
  
  return cached || []
}

export async function getProjectAction(projectId: string) {
  const session = await auth()
  if (!session?.user?.name) return null
  const userId = session.user.name
  
  // 1. Try Blob Working Copy index.json
  try {
     const indexStr = await getFromWorkingDir(userId, projectId, 'main', 'index.json')
     if (indexStr) return JSON.parse(indexStr)
  } catch (e) {}

  // 2. Try User Meta Cache
  const projects = await getUserMeta(userId, 'projects')
  if (projects) {
     const p = projects.find((p: any) => p.id === projectId)
     if (p) return p
  }

  // 3. Fallback to GitHub
  try {
    if (session.accessToken) {
      const octokit = await getOctokit(session.accessToken)
      const p = await getProject(octokit, userId, projectId)
      return p
    }
  } catch (e) {
    console.error(`Failed to fetch project ${projectId} from GitHub`, e)
  }

  return null
}

export async function refreshProjectsAction() {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return { success: false }
  const userId = session.user.name
  
  const octokit = await getOctokit(session.accessToken)
  const projects = await listProjects(octokit, userId)
  
  // Update Cache
  await saveUserMeta(userId, 'projects', projects)
  
  revalidatePath('/dashboard')
  return { success: true, projects }
}
