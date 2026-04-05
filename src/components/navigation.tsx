import { signOut } from "@/auth"
import { BookOpen, LogOut } from "lucide-react"
import Link from "next/link"
import { SyncStatus } from "./SyncStatus"

export default function Navigation({ user }: { user: any }) {
  return (
    <nav className="w-full border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-zinc-100 hover:text-emerald-400 transition-colors">
        <BookOpen className="w-6 h-6 text-emerald-500" />
        Inkmate
      </Link>
      
      <div className="flex items-center gap-8">
        <SyncStatus />
        
        <div className="flex items-center gap-3">
          {user?.image ? (
             <img src={user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-zinc-800" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700" />
          )}
          <span className="text-sm font-medium text-zinc-300">{user?.name}</span>
        </div>
        
        <form
          action={async () => {
             "use server"
             await signOut()
          }}
        >
          <button type="submit" className="text-sm flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
