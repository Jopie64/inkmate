"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { Save, Plus, Edit2, BookOpen, Loader2 } from "lucide-react"
import { getChapterContentAction, saveChapterAction } from "@/app/actions/chapters"
import { useRouter } from "next/navigation"
import { getLocalChapter, saveLocalChapter, clearLocalChapter } from "@/lib/cache"

export function ChaptersClient({ projectId, initialChapters }: { projectId: string, initialChapters: any[] }) {
  const router = useRouter()
  const [chapters, setChapters] = useState(initialChapters)
  const [selectedId, setSelectedId] = useState<string | null>(chapters.length > 0 ? chapters[0].id : null)
  
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    const loadChapter = async () => {
      // 1. Check local cache first for eventual consistency
      const localText = getLocalChapter(projectId, selectedId)
      if (localText) {
        setContent(localText)
        const ch = chapters.find(c => c.id === selectedId)
        if (ch) setTitle(ch.title)
        // We still load from server in background if content is empty or to stay in sync
        if (localText.trim()) {
           setIsLoading(false)
           return
        }
      }

      setIsLoading(true)
      try {
        const text = await getChapterContentAction(projectId, selectedId)
        setContent(text || "")
        const ch = chapters.find(c => c.id === selectedId)
        if (ch) setTitle(ch.title)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    loadChapter()
  }, [selectedId, projectId, chapters])

  const handleSave = async () => {
    if (!title.trim()) return
    setIsSaving(true)
    try {
      // 1. Optimistic UI / Local Cache
      saveLocalChapter(projectId, selectedId || 'new', content)
      
      const newId = await saveChapterAction(projectId, title, content, selectedId || undefined)
      if (!selectedId) {
         setSelectedId(newId)
         // Move local cache from 'new' to actual ID
         saveLocalChapter(projectId, newId, content)
         clearLocalChapter(projectId, 'new')
         setChapters([...chapters, { id: newId, title }])
      } else {
         setChapters(chapters.map(c => c.id === selectedId ? { ...c, title } : c))
      }
      setIsEditing(false)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleNew = () => {
    setSelectedId(null)
    setTitle("New Chapter")
    setContent("")
    setIsEditing(true)
  }

  return (
    <>
      <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80">
          <span className="font-semibold text-zinc-100">Chapters</span>
          <button onClick={handleNew} className="p-1.5 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/40 rounded-md transition cursor-pointer">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chapters.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${selectedId === c.id ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              {c.title}
            </button>
          ))}
          {chapters.length === 0 && !selectedId && <div className="text-zinc-600 text-xs p-2 text-center mt-4">No chapters yet.</div>}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col bg-zinc-900/10">
        {!selectedId && !isEditing && !content.trim() && title === "New Chapter" ? (
           <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
             <BookOpen className="w-12 h-12 mb-4 opacity-20" />
             <p>Select a chapter or create a new one.</p>
           </div>
        ) : (
          <>
            <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
              {isEditing ? (
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white px-3 py-1.5 rounded-md focus:outline-none focus:border-emerald-500 font-medium w-1/3"
                />
              ) : (
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              )}
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${isEditing ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20'}`}
                >
                  {isEditing ? <><BookOpen className="w-4 h-4"/> Preview</> : <><Edit2 className="w-4 h-4"/> Edit</>}
                </button>
                {isEditing && (
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
              {isLoading ? (
                <div className="mt-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
              ) : isEditing ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your chapter here... You can use Markdown formatting."
                  className="w-full max-w-4xl h-full min-h-[500px] bg-transparent text-zinc-300 font-mono text-base leading-relaxed focus:outline-none resize-none mx-auto p-4"
                />
              ) : (
                <div className="w-full max-w-3xl mx-auto pb-32">
                  <article className="prose prose-invert prose-emerald lg:prose-lg max-w-none">
                    {content ? <ReactMarkdown>{content}</ReactMarkdown> : <p className="text-zinc-600 italic">This chapter is empty.</p>}
                  </article>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
