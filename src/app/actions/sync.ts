"use server"

import { auth } from "@/auth"
import { getOctokit, REPO_NAME, commitMultipleFiles } from "@/lib/github"
import { 
  listDirtyFiles, 
  getFromWorkingDir, 
  getSyncMeta, 
  saveSyncMeta, 
  clearDirtyMarkers 
} from "@/lib/blob"
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
  
  revalidatePath(`/dashboard/project/${projectId}`)
  
  return { 
    success: true, 
    branch: targetBranch, 
    isConflict: targetBranch !== branchName 
  }
}
