import { put, list, del, head, get } from "@vercel/blob"

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
  await put(fullPath, content, { access: 'private', addRandomSuffix: false, allowOverwrite: true })
  
  // 2. Mark as dirty
  await put(dirtyPath, 'dirty', { access: 'private', addRandomSuffix: false, allowOverwrite: true })
}

export async function getFromWorkingDir(
  userId: string,
  projectId: string,
  branchName: string,
  path: string
) {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/working/${path}`
  try {
    const result = await get(fullPath, { access: 'private' })
    if (result && result.statusCode === 200) {
      const reader = result.stream.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      return Buffer.concat(chunks).toString("utf-8")
    }
    return null
  } catch (e) {
    console.error("Error reading from Blob working dir", e)
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

export async function listAllDirtyFiles(userId: string) {
  const prefix = `${userId}/projects/`
  const { blobs } = await list({ prefix })
  // Path format: userId/projects/projectId/branches/branchName/dirty/path
  return blobs
    .filter(b => b.pathname.includes('/dirty/'))
    .map(b => {
      const parts = b.pathname.split('/')
      const dirtyIndex = parts.indexOf('dirty')
      return {
        projectId: parts[2],
        branchName: parts[4],
        path: parts.slice(dirtyIndex + 1).join('/')
      }
    })
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
  try {
    const result = await get(fullPath, { access: 'private' })
    if (result && result.statusCode === 200) {
       const reader = result.stream.getReader()
       const chunks: Uint8Array[] = []
       while (true) {
         const { done, value } = await reader.read()
         if (done) break
         chunks.push(value)
       }
       return JSON.parse(Buffer.concat(chunks).toString("utf-8"))
    }
    return null
  } catch (e) {
    console.error("Error reading sync meta from Blob", e)
    return null
  }
}

export async function saveSyncMeta(
  userId: string,
  projectId: string,
  branchName: string,
  meta: ProjectSyncMeta
) {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/meta.json`
  await put(fullPath, JSON.stringify(meta), { access: 'private', addRandomSuffix: false, allowOverwrite: true })
}

export async function getBlobFileUrl(pathname: string) {
    const { blobs } = await list({ prefix: pathname });
    if (blobs.length > 0) return blobs[0].url;
    return null;
}

export async function deleteFromWorkingDir(
  userId: string,
  projectId: string,
  branchName: string,
  path: string
) {
  const fullPath = `${getBasePath(userId, projectId, branchName)}/working/${path}`
  const { blobs } = await list({ prefix: fullPath })
  if (blobs.length > 0) {
    await del(blobs.map(b => b.url))
  }
}

export async function getUserMeta(userId: string, key: string) {
  const fullPath = `${userId}/meta/${key}.json`
  try {
    const result = await get(fullPath, { access: 'private' })
    if (result && result.statusCode === 200) {
       const reader = result.stream.getReader()
       const chunks: Uint8Array[] = []
       while (true) {
         const { done, value } = await reader.read()
         if (done) break
         chunks.push(value)
       }
       return JSON.parse(Buffer.concat(chunks).toString("utf-8"))
    }
    return null
  } catch (e) {
    return null
  }
}

export async function saveUserMeta(userId: string, key: string, data: any) {
  const fullPath = `${userId}/meta/${key}.json`
  await put(fullPath, JSON.stringify(data), { access: 'private', addRandomSuffix: false, allowOverwrite: true })
}
