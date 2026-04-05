"use client"

import { useState, useEffect } from "react"
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Send } from "lucide-react"
import { getSyncStatusAction, syncProjectToGitHubAction } from "@/app/actions/sync"
import { motion, AnimatePresence } from "framer-motion"

export function SyncStatus({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<{ isDirty: boolean; count: number }>({ isDirty: false, count: 0 })
  const [isSyncing, setIsSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const [result, setResult] = useState<{ success: boolean; message?: string; isConflict?: boolean; branch?: string } | null>(null)

  const checkStatus = async () => {
    try {
      const s = await getSyncStatusAction(projectId)
      setStatus({ isDirty: s.isDirty, count: s.count })
    } catch (e) {
      console.error("Failed to fetch sync status", e)
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 300000) // Poll every 5 minutes
    return () => clearInterval(interval)
  }, [projectId])

  const handleSync = async () => {
    setIsSyncing(true)
    setResult(null)
    try {
      const msg = commitMessage.trim() || `docs: update project ${projectId} (synced from Inkmate)`
      const res = await syncProjectToGitHubAction(projectId, msg)
      
      if (res.success) {
        setResult({ success: true, isConflict: res.isConflict, branch: res.branch })
        setStatus({ isDirty: false, count: 0 })
        
        // Stay open a bit longer if there was a conflict to show the message
        setTimeout(() => {
          setShowModal(false)
          setResult(null)
          setCommitMessage("")
        }, res.isConflict ? 5000 : 2000)
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div 
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          status.isDirty 
            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
        }`}
        title={status.isDirty ? `${status.count} files modified locally` : 'All changes synced to GitHub'}
      >
        {status.isDirty ? <CloudOff className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">
          {status.isDirty ? `${status.count} unsynced changes` : 'Synced to GitHub'}
        </span>
      </div>

      {status.isDirty && (
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold transition-all shadow-lg shadow-emerald-900/20 cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync
        </button>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-xl font-bold text-white mb-2">Push to GitHub</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Save your progress permanently to your version history.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Commit Message</label>
                  <textarea 
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Describe what you've changed..."
                    disabled={isSyncing || !!result}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[100px] resize-none transition-all"
                  />
                </div>

                <AnimatePresence>
                  {result && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-3 rounded-lg flex flex-col gap-2 text-sm ${
                        result.success 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {result.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium">
                          {result.success ? 'Successfully synced!' : result.message}
                        </span>
                      </div>
                      {result.isConflict && (
                        <p className="text-amber-400 text-xs mt-1 bg-amber-400/10 p-2 rounded border border-amber-400/20">
                          <strong>Conflict Detected:</strong> GitHub has moved forward since your last sync. A new branch <code>{result.branch}</code> has been created. Merge it on GitHub to continue.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  {!result && (
                    <>
                      <button 
                        disabled={isSyncing}
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button 
                        disabled={isSyncing}
                        onClick={handleSync}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isSyncing ? 'Syncing...' : 'Sync to GitHub'}
                      </button>
                    </>
                  )}
                  {result && !result.isConflict && (
                     <button 
                        onClick={() => setShowModal(false)}
                        className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg font-medium transition-colors cursor-pointer"
                     >
                       Close
                     </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
