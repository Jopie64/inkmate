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
