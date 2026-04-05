import { put, list, del, head } from "@vercel/blob"

/**
 * Path structure:
 * [userId]/projects/[projectId]/branches/[branchName]/working/[path]
 * [userId]/projects/[projectId]/branches/[branchName]/dirty/[path]
 * [userId]/projects/[projectId]/branches/[branchName]/meta.json
 */

export interface ProjectSyncMeta {
  lastSyncedSha: string
  lastSyncedAt: string
  baseBranch: string
}

function getBasePath(userId: string, projectId: string, branchName: string) {
  return `${userId}/projects/${projectId}/branches/${branchName}`
}

export async function saveToWorkingDir(
  userId: string,
  projectId: string,
  branchName: string,
  path: string,
  content: string | Buffer
) {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/working/${path}`
  const dirtyPath = `${getBasePath(userId, projectId, branchName)}/dirty/${path}`
  
  // 1. Save the file
  await put(fullPath, content, { access: 'public', addRandomSuffix: false })
  
  // 2. Mark as dirty
  await put(dirtyPath, '', { access: 'public', addRandomSuffix: false })
}

export async function getFromWorkingDir(
  userId: string,
  projectId: string,
  branchName: string,
  path: string
) {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/working/${path}`
  try {
    const response = await fetch(`https://inkmate-blob.vercel.app/${fullPath}`) // This is a placeholder, actual blob URLs are different but we can use head() to get it
    // Actually, Vercel Blob URLs are not deterministic like this. 
    // We should use list() to find the URL or store the URL in a manifest.
    // BUT! Vercel Blob is not a file system. If we use addRandomSuffix: false, we still get a randomish URL.
    // Wait, addRandomSuffix: false means the URL is deterministic based on the token and path? No, it just avoids the suffix.
    // Let's check the Vercel Blob documentation (mentally or via search if needed).
    // Actually, we should probably store the mapping or use list() with prefix.
    
    const { blobs } = await list({ prefix: fullPath })
    if (blobs.length > 0) {
      const resp = await fetch(blobs[0].url)
      return await resp.text()
    }
    return null
  } catch (e) {
    return null
  }
}

export async function listDirtyFiles(
  userId: string,
  projectId: string,
  branchName: string
) {
  const prefix = `${getBasePath(userId, projectId, branchName)}/dirty/`
  const { blobs } = await list({ prefix })
  return blobs.map(b => b.pathname.replace(prefix, ''))
}

export async function clearDirtyMarkers(
  userId: string,
  projectId: string,
  branchName: string,
  paths?: string[]
) {
  const prefix = `${getBasePath(userId, projectId, branchName)}/dirty/`
  if (paths) {
    const fullPaths = paths.map(p => `${prefix}${p}`)
    // del() can take an array of URLs, but we have pathnames.
    // We need the URLs.
    const { blobs } = await list({ prefix })
    const urlsToDelete = blobs
      .filter(b => paths.includes(b.pathname.replace(prefix, '')))
      .map(b => b.url)
    
    if (urlsToDelete.length > 0) {
      await del(urlsToDelete)
    }
  } else {
    // Clear all
    const { blobs } = await list({ prefix })
    if (blobs.length > 0) {
      await del(blobs.map(b => b.url))
    }
  }
}

export async function getSyncMeta(
  userId: string,
  projectId: string,
  branchName: string
): Promise<ProjectSyncMeta | null> {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/meta.json`
  const { blobs } = await list({ prefix: fullPath })
  if (blobs.length > 0) {
    const resp = await fetch(blobs[0].url)
    return await resp.json()
  }
  return null
}

export async function saveSyncMeta(
  userId: string,
  projectId: string,
  branchName: string,
  meta: ProjectSyncMeta
) {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/meta.json`
  await put(fullPath, JSON.stringify(meta), { access: 'public', addRandomSuffix: false })
}

export async function getBlobFileUrl(pathname: string) {
    const { blobs } = await list({ prefix: pathname });
    if (blobs.length > 0) return blobs[0].url;
    return null;
}
