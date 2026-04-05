"use server"
import { auth } from "@/auth"
import { getOctokit, REPO_NAME, commitMultipleFiles, getFileContent } from "@/lib/github"
import { 
  listDirtyFiles,
  listAllDirtyFiles, 
  getFromWorkingDir, 
  getSyncMeta, 
  saveSyncMeta, 
  clearDirtyMarkers,
  saveToWorkingDir,
  deleteFromWorkingDir 
} from "@/lib/blob"
import { getProjectsAction } from "@/app/actions/projects"
import { Octokit } from "octokit"
import { revalidatePath } from "next/cache"

export async function getGlobalSyncStatusAction() {
  const session = await auth()
  if (!session?.user?.name) return { isDirty: false, count: 0, projects: [] }
  
  const userId = session.user.name
  const dirtyFiles = await listAllDirtyFiles(userId)
  const projectIds = Array.from(new Set(dirtyFiles.map(f => f.projectId)))
  
  return {
    isDirty: dirtyFiles.length > 0,
    count: dirtyFiles.length,
    projects: projectIds
  }
}

export async function syncGlobalAction(commitMessage?: string) {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) throw new Error("Unauthorized")
  
  const userId = session.user.name
  const octokit = await getOctokit(session.accessToken as string)
  
  // 1. Get ALL dirty files across all projects
  const allDirty = await listAllDirtyFiles(userId)
  if (allDirty.length === 0) return { success: true, message: "Nothing to sync" }
  
  // 2. Fetch contents and prepare commit
  const filesToCommit = await Promise.all(allDirty.map(async f => {
    const content = await getFromWorkingDir(userId, f.projectId, f.branchName, f.path)
    return { path: `${f.projectId}/${f.path}`, content: content || "" }
  }))
  
  const projectIds = Array.from(new Set(allDirty.map(f => f.projectId)))
  const defaultMsg = `docs: sync changes for [${projectIds.join(", ")}]`
  const finalMsg = commitMessage || defaultMsg
  
  // 3. Batch Commit to main branch (Global)
  // Note: For simplicity, we assume we always target 'main' for global sync
  const branchName = "main"
  const newSha = await commitMultipleFiles(
    octokit,
    userId,
    REPO_NAME,
    branchName,
    filesToCommit,
    finalMsg
  )
  
  // 4. Update Meta for all involved projects
  for (const pid of projectIds) {
    await saveSyncMeta(userId, pid, branchName, {
        lastSyncedSha: newSha,
        lastSyncedAt: new Date().toISOString(),
        baseBranch: branchName
    })
    await clearDirtyMarkers(userId, pid, branchName)
  }
  
  revalidatePath(`/dashboard`)
  return { 
    success: true, 
    message: `Synced ${allDirty.length} files across ${projectIds.length} projects.`
  }
}

export async function checkAndSyncGlobalAction() {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return { status: 'unauthorized' }
  const userId = session.user.name
  
  try {
    // 1. Get all projects from manifest
    const projects = await getProjectsAction()
    const octokit = await getOctokit(session.accessToken)
    
    // 2. Get remote head SHA
    let remoteSha = ""
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner: userId,
        repo: REPO_NAME,
        ref: `heads/main`
      })
      remoteSha = refData.object.sha
    } catch (e: any) {
      if (e.status === 404) return { status: 'not-on-github' }
      throw e
    }

    let syncedCount = 0
    let dirtyGlobal = false

    // 3. Check each project
    for (const project of projects) {
      const meta = await getSyncMeta(userId, project.id, 'main')
      const dirtyFiles = await listDirtyFiles(userId, project.id, 'main')
      if (dirtyFiles.length > 0) dirtyGlobal = true

      if (meta && meta.lastSyncedSha !== remoteSha && dirtyFiles.length === 0) {
        await seedProjectFromGitHub(octokit, userId, project.id, 'main', remoteSha)
        syncedCount++
      } else if (!meta && dirtyFiles.length === 0) {
        await seedProjectFromGitHub(octokit, userId, project.id, 'main', remoteSha)
        syncedCount++
      }
    }

    return { 
      status: syncedCount > 0 ? 'synced' : 'up-to-date', 
      syncedProjects: syncedCount,
      isDirty: dirtyGlobal,
      remoteSha
    }
  } catch (e: any) {
    console.error("Global sync check failed", e)
    return { status: 'github-error', error: e.message }
  }
}

async function seedProjectFromGitHub(octokit: Octokit, userId: string, projectId: string, branch: string, sha: string) {
    // 1. Get index.json
    const indexContent = await getFileContent(octokit, userId, `${projectId}/index.json`)
    if (indexContent) {
        await saveToWorkingDir(userId, projectId, branch, 'index.json', indexContent)
        const index = JSON.parse(indexContent)
        
        // 2. Get all chapters
        if (index.chapters) {
            for (const ch of index.chapters) {
                const chContent = await getFileContent(octokit, userId, `${projectId}/chapters/${ch.id}/full.md`)
                if (chContent) {
                    await saveToWorkingDir(userId, projectId, branch, `chapters/${ch.id}/full.md`, chContent)
                }
            }
        }
    }
    
    // 3. Save meta (this file is NOT synced to GitHub)
    await saveSyncMeta(userId, projectId, branch, {
        lastSyncedSha: sha,
        lastSyncedAt: new Date().toISOString(),
        baseBranch: branch
    })
    
    // 4. Clear dirty markers just in case
    await clearDirtyMarkers(userId, projectId, branch)
}
