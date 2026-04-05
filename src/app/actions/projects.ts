"use server"

import { auth } from "@/auth"
import { getOctokit, listProjects, ensureRepository } from "@/lib/github"
import { getUserMeta, saveUserMeta } from "@/lib/blob"
import { revalidatePath } from "next/cache"

export async function getProjectsAction() {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return []
  const userId = session.user.name
  
  // 1. Try Blob Meta First
  const cached = await getUserMeta(userId, 'projects')
  if (cached) return cached
  
  // 2. Fallback to GitHub
  const octokit = await getOctokit(session.accessToken)
  // Ensure the repository exists for new users
  await ensureRepository(octokit, userId)
  const projects = await listProjects(octokit, userId)
  
  // 3. Seed Blob Cache
  await saveUserMeta(userId, 'projects', projects)
  
  return projects
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
