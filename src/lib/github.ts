import { Octokit } from "octokit"

export const REPO_NAME = "inkmate-data"

export async function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

export async function ensureRepository(octokit: Octokit, owner: string) {
  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo: REPO_NAME,
    })
    return data
  } catch (error: any) {
    if (error.status === 404) {
      const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        description: "Inkmate story data repository",
        private: true,
        auto_init: true,
      })
      return data
    }
    throw error
  }
}

export async function listProjects(octokit: Octokit, owner: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: REPO_NAME,
      path: "",
    })
    
    if (!Array.isArray(data)) return []
    
    const projectDirs = data.filter((item) => item.type === "dir" && !item.name.startsWith("."))
    const projects = []
    
    for (const dir of projectDirs) {
      try {
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo: REPO_NAME,
          path: `${dir.name}/index.json`,
        })
        
        if ("content" in fileData) {
          const content = Buffer.from(fileData.content, "base64").toString("utf-8")
          const projectInfo = JSON.parse(content)
          projects.push({
            id: projectInfo.id || dir.name,
            title: projectInfo.title || dir.name,
            lastEdited: "Recently", // Simplified
             summary: projectInfo.summary || "No summary available."
          })
        }
      } catch (e) {
        projects.push({
          id: dir.name,
          title: dir.name,
          lastEdited: "Unknown",
          summary: "No summary available."
        })
      }
    }
    
    return projects
  } catch (error: any) {
    if (error.status === 404) return []
    throw error
  }
}

export async function createProject(octokit: Octokit, owner: string, title: string) {
  const uuid = crypto.randomUUID()
  
  const indexData = {
    id: uuid,
    title,
    summary: "A new story begins here.",
    chapters: []
  }
  
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: REPO_NAME,
    path: `${uuid}/index.json`,
    message: `feat: create project ${title}`,
    content: Buffer.from(JSON.stringify(indexData, null, 2)).toString("base64"),
    branch: "main"
  })
  
  return uuid
}

export async function getProject(octokit: Octokit, owner: string, id: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: REPO_NAME,
      path: `${id}/index.json`,
    })
    
    if ("content" in data) {
      const content = Buffer.from(data.content as string, "base64").toString("utf-8")
      return JSON.parse(content)
    }
    return null
  } catch (error: any) {
    if (error.status === 404) return null
    throw error
  }
}

export async function getFileContent(octokit: Octokit, owner: string, path: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: REPO_NAME,
      path,
    })
    if (!Array.isArray(data) && "content" in data) {
      return Buffer.from(data.content as string, "base64").toString("utf-8")
    }
    return null
  } catch (error: any) {
    if (error.status === 404) return null
    throw error
  }
}

export async function createOrUpdateFile(octokit: Octokit, owner: string, path: string, content: string, message: string) {
  let sha: string | undefined
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: REPO_NAME,
      path,
    })
    if (!Array.isArray(data) && "sha" in data) sha = data.sha
  } catch (error: any) {
    if (error.status !== 404) throw error
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: REPO_NAME,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
    sha,
  })
}

export async function commitMultipleFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  message: string
) {
  // 1. Get the current commit SHA
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  })
  const baseSha = refData.object.sha

  // 2. Get the tree SHA for the base commit
  const { data: commitData } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: baseSha,
  })
  const baseTreeSha = commitData.tree.sha

  // 3. Create the new tree
  const treeItems = files.map(file => ({
    path: file.path,
    mode: "100644" as const,
    type: "blob" as const,
    content: file.content,
  }))

  const { data: newTreeData } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  })

  // 4. Create the new commit
  const { data: newCommitData } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: newTreeData.sha,
    parents: [baseSha],
  })

  // 5. Update the ref
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommitData.sha,
  })

  return newCommitData.sha
}

