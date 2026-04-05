import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProjectAction } from "@/app/actions/projects"
import Link from "next/link"
import { FileText, BookOpen, Users, StickyNote, History, MessageSquare, ChevronLeft } from "lucide-react"
import { SyncStatus } from "@/components/SyncStatus"

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const session = await auth()
  if (!session?.accessToken) redirect("/")
  
  const { projectId } = await params
  
  // Use Blob-First projects action
  const project = await getProjectAction(projectId)
  
  if (!project) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p>Project not found or you don't have access.</p>
        <Link href="/dashboard" className="text-emerald-500 hover:underline mt-4 inline-block">Return to Dashboard</Link>
      </div>
    )
  }

  const tabs = [
    { name: "Description", href: `/dashboard/project/${projectId}/description`, icon: FileText },
    { name: "Chapters", href: `/dashboard/project/${projectId}/chapters`, icon: BookOpen },
    { name: "Characters", href: `/dashboard/project/${projectId}/characters`, icon: Users },
    { name: "Notes", href: `/dashboard/project/${projectId}/notes`, icon: StickyNote },
    { name: "History", href: `/dashboard/project/${projectId}/history`, icon: History },
    { name: "Chats", href: `/dashboard/project/${projectId}/chats`, icon: MessageSquare },
  ]

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-50">
      <header className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-sm text-zinc-400">Workspace</p>
            </div>
          </div>
          
          <SyncStatus projectId={projectId} />
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Link 
                key={tab.name} 
                href={tab.href}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            )
          })}
        </div>
      </header>
      
      {/* Tab Content Area */}
      <div className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </div>
    </div>
  )
}
