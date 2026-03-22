import { auth } from "@/auth"
import { getOctokit, createProject } from "@/lib/github"
import { redirect } from "next/navigation"

export default async function NewProject() {
  async function submit(formData: FormData) {
    "use server"
    const title = formData.get("title") as string
    
    if (!title) return
    
    const session = await auth()
    if (!session?.accessToken) return
    
    const octokit = await getOctokit(session.accessToken)
    const { data: user } = await octokit.rest.users.getAuthenticated()
    
    const uuid = await createProject(octokit, user.login, title)
    
    redirect(`/dashboard`)
  }

  return (
    <div className="max-w-2xl mx-auto p-8 mt-12 bg-zinc-900/50 border border-zinc-800 rounded-xl">
      <h1 className="text-2xl font-bold mb-6">Create a New Story</h1>
      <form action={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-400 mb-1">Story Title</label>
          <input 
            type="text" 
            id="title"
            name="title" 
            required 
            placeholder="e.g. The Quantum Protocol"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md transition-colors cursor-pointer">
            Create Story
          </button>
        </div>
      </form>
    </div>
  )
}
