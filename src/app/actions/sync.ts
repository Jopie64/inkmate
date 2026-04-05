"use server"
import { auth } from "@/auth"
import { getOctokit, REPO_NAME, commitMultipleFiles, getFileContent } from "@/lib/github"
import { 
  listDirtyFiles, 
  getFromWorkingDir, 
  getSyncMeta, 
  saveSyncMeta, 
  clearDirtyMarkers,
  saveToWorkingDir,
  deleteFromWorkingDir 
} from "@/lib/blob"
import { Octokit } from "octokit"
import { revalidatePath } from "next/cache"

export async function getSyncStatusAction(projectId: string, branchName: string = "main") {
  const session = await auth()
  if (!session?.user?.name) return { isDirty: false, count: 0 }
  
  const userId = session.user.name
  const dirtyFiles = await listDirtyFiles(userId, projectId, branchName)
  
  return {
    isDirty: dirtyFiles.length > 0,
    count: dirtyFiles.length,
    files: dirtyFiles
  }
}

export async function syncProjectToGitHubAction(projectId: string, commitMessage: string, branchName: string = "main") {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) throw new Error("Unauthorized")
  
  const userId = session.user.name
  const octokit = await getOctokit(session.accessToken as string)
  
  // 1. Get dirty files
  const dirtyPaths = await listDirtyFiles(userId, projectId, branchName)
  if (dirtyPaths.length === 0) return { success: true, message: "Nothing to sync" }
  
  // 2. Fetch contents from Blob Working Dir
  const filesToCommit = await Promise.all(dirtyPaths.map(async p => {
    const content = await getFromWorkingDir(userId, projectId, branchName, p)
    return { path: `${projectId}/${p}`, content: content || "" }
  }))
  
  // 3. Conflict Detection
  let targetBranch = branchName
  const meta = await getSyncMeta(userId, projectId, branchName)
  
  try {
    const { data: refData } = await octokit.rest.git.getRef({
      owner: userId,
      repo: REPO_NAME,
      ref: `heads/${branchName}`
    })
    const remoteSha = refData.object.sha
    
    if (meta && meta.lastSyncedSha !== remoteSha) {
      // Conflict detected!
      targetBranch = `${branchName}-conflict-${Date.now()}`
      
      // Create the conflict branch starting from the last known synced commit
      await octokit.rest.git.createRef({
        owner: userId,
        repo: REPO_NAME,
        ref: `refs/heads/${targetBranch}`,
        sha: meta.lastSyncedSha
      })
    }
  } catch (e: any) {
    if (e.status !== 404) throw e
    // If branch doesn't exist, we'll just let commitMultipleFiles fail or handle it
  }
  
  // 4. Batch Commit to GitHub
  const newSha = await commitMultipleFiles(
    octokit,
    userId,
    REPO_NAME,
    targetBranch,
    filesToCommit,
    commitMessage || `docs: sync changes for project ${projectId}`
  )
  
  // 5. Post-sync maintenance
  await saveSyncMeta(userId, projectId, branchName, {
    lastSyncedSha: newSha,
    lastSyncedAt: new Date().toISOString(),
    baseBranch: branchName
  })
  
  await clearDirtyMarkers(userId, projectId, branchName)
  
  return { 
    success: true, 
    branch: targetBranch, 
    isConflict: targetBranch !== branchName 
  }
}

export async function checkAndSyncProjectAction(projectId: string, branchName: string = "main") {
  const session = await auth()
  if (!session?.user?.name || !session?.accessToken) return { status: 'unauthorized' }
  const userId = session.user.name
  
  // 1. Get local state
  const meta = await getSyncMeta(userId, projectId, branchName)
  const dirtyFiles = await listDirtyFiles(userId, projectId, branchName)
  
  // 2. Get remote state
  const octokit = await getOctokit(session.accessToken)
  let remoteSha = ""
  try {
    const { data: refData } = await octokit.rest.git.getRef({
      owner: userId,
      repo: REPO_NAME,
      ref: `heads/${branchName}`
    })
    remoteSha = refData.object.sha
  } catch (e: any) {
    if (e.status === 404) return { status: 'not-on-github' }
    throw e
  }
  
  // 3. Sync if remote is ahead and NOT dirty
  if (meta && meta.lastSyncedSha !== remoteSha && dirtyFiles.length === 0) {
    console.log(`Syncing project ${projectId} from GitHub (remote moved from ${meta.lastSyncedSha} to ${remoteSha})`)
    
    // Fetch project index and chapters from GitHub and update Blob
    await seedProjectFromGitHub(octokit, userId, projectId, branchName, remoteSha)
    
    return { status: 'synced-from-github', newSha: remoteSha }
  }
  
  if (!meta && dirtyFiles.length === 0) {
     // Initial seed
     await seedProjectFromGitHub(octokit, userId, projectId, branchName, remoteSha)
     return { status: 'initial-seed', newSha: remoteSha }
  }
  
  return { 
    status: 'up-to-date', 
    isDirty: dirtyFiles.length > 0, 
    remoteAhead: meta ? meta.lastSyncedSha !== remoteSha : false 
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
