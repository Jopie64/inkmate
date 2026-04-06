"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Bot, User, CheckSquare, Square, Settings } from "lucide-react"
import { useState } from "react"
import { useParams } from "next/navigation"

export default function ChatsPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [contextConfig, setContextConfig] = useState({
    description: true,
    chapterSummaries: true,
    lastTwoChapters: true,
    chatHistory: true,
    characters: true,
  })

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      body: {
        projectId,
        contextConfig
      }
    }),
    onFinish: (options: any) => {
      console.log("[useChat onFinish]: Message complete", options);
    },
    onError: (err: any) => {
      console.error("[useChat Error]:", err);
    }
  })
  const isLoading = status === 'streaming' || status === 'submitted'
  const [input, setInput] = useState("")

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput("")
  }

  const toggleContext = (key: keyof typeof contextConfig) => {
    setContextConfig((prev: any) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden">
      
      {/* Sidebar / Context Settings */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-4 flex-col hidden md:flex">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold mb-6">
          <Settings className="w-5 h-5 text-emerald-500" />
          <span>Context Engine</span>
        </div>
        
        <p className="text-xs text-zinc-500 mb-4">Select what the AI can see during this session.</p>
        
        <div className="flex flex-col gap-3">
          {Object.entries(contextConfig).map(([key, value]) => (
            <button 
              key={key} 
              onClick={() => toggleContext(key as keyof typeof contextConfig)}
              className="flex items-center gap-3 text-sm text-zinc-300 hover:text-white transition-colors text-left cursor-pointer"
            >
              {value ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-zinc-600" />}
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-900/10 relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <Bot className="w-12 h-12 text-zinc-700 mb-4" />
              <h3 className="text-xl font-bold text-zinc-300 mb-2">AI Co-Writer</h3>
              <p className="text-zinc-500 text-sm">
                Start a conversation to brainstorm ideas, generate text, or ask for feedback on your characters and plot.
              </p>
            </div>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className={`flex gap-4 max-w-3xl mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-800 flex items-center justify-center mt-1 flex-shrink-0">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                
                <div className={`px-5 py-3 rounded-2xl max-w-[85%] flex-col gap-2 flex ${
                  m.role === 'user' 
                    ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-50' 
                    : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-100'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.parts?.map((part: any, i: number) => {
                      if (part.type === 'text') return <span key={i}>{part.text}</span>;
                      if (part.type === 'tool-saveChapter') {
                        return <div key={i} className="text-xs text-orange-400 italic bg-orange-950/30 border border-orange-900/50 p-2 rounded-md my-2 block">📝 {part.state === 'output-available' ? `Chapter saved: ${part?.output?.title || ''}` : "Saving chapter..."}</div>
                      }
                      if (part.type === 'tool-listChapters') {
                         return <div key={i} className="text-xs text-blue-400 italic bg-blue-950/30 border border-blue-900/50 p-2 rounded-md my-2 block">🔍 {part.state === 'output-available' ? "Chapters read" : "Fetching chapters..."}</div>
                      }
                      if (part.type === 'tool-readChapter') {
                         return <div key={i} className="text-xs text-purple-400 italic bg-purple-950/30 border border-purple-900/50 p-2 rounded-md my-2 block">📖 {part.state === 'output-available' ? "Content read" : "Fetching chapter content..."}</div>
                      }
                      return null;
                    })}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mt-1 flex-shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          <div className="max-w-3xl mx-auto relative flex flex-col gap-2">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
                <span className="font-bold">API Error:</span> {error.message || "Failed to fetch response. Check your API key or connection."}
              </div>
            )}
            <form onSubmit={handleSubmit} className="relative flex items-end w-full">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your AI co-writer (e.g. 'Write an introduction...')..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none min-h-[56px] max-h-48 scrollbar-hide"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((input || "").trim()) {
                      const form = e.currentTarget.closest('form');
                      form?.requestSubmit();
                    }
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={isLoading || !(input || "").trim()}
                className="absolute right-3 bottom-3 p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
