import { Plus, Settings2, Clock } from "lucide-react"
import Link from "next/link"

const MOCK_PROJECTS = [
  { id: "uuid-1", title: "The Quantum Protocol", lastEdited: "2 hours ago", summary: "A sci-fi thriller about a rogue AI attempting to rewrite physics." },
  { id: "uuid-2", title: "Shadows of Aethelgard", lastEdited: "Yesterday", summary: "Fantasy epic following three unlikely heroes." },
]

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Stories</h1>
          <p className="text-zinc-400 mt-1">Manage and continue writing your projects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* New Project Button */}
        <button className="flex flex-col items-center justify-center gap-4 h-64 rounded-xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900/50 transition-all group cursor-pointer text-zinc-400 hover:text-emerald-400">
          <div className="p-4 rounded-full bg-zinc-900 group-hover:bg-emerald-950/50 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
          <span className="font-semibold tracking-wide">New Story</span>
        </button>

        {/* Project Cards */}
        {MOCK_PROJECTS.map((project) => (
          <div key={project.id} className="flex flex-col h-64 rounded-xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/60 transition-all overflow-hidden group">
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-zinc-100 mb-2 truncate group-hover:text-emerald-400 transition-colors">{project.title}</h3>
              <p className="text-sm text-zinc-400 line-clamp-3 mb-4 flex-1">{project.summary}</p>
              
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-auto">
                <Clock className="w-3.5 h-3.5" />
                Last edited {project.lastEdited}
              </div>
            </div>
            
            <div className="border-t border-zinc-800/50 p-4 bg-zinc-900/40 flex justify-between items-center">
              <Link href={`/dashboard/project/${project.id}`} className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-1">
                Open Project →
              </Link>
              <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-md hover:bg-zinc-800 cursor-pointer">
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
