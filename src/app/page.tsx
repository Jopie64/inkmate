import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-zinc-50">
      <div className="z-10 max-w-5xl w-full flex flex-col items-center justify-center font-mono text-sm gap-8">
        <h1 className="text-4xl font-bold tracking-tight">Inkmate</h1>
        <p className="text-zinc-400">AI-Assisted Story Writing App</p>

        <div className="mt-8 p-8 border border-zinc-800 rounded-lg bg-zinc-900/50 w-full max-w-md text-center flex flex-col gap-4">
          <p>Please sign in to access your projects.</p>
          <form
            action={async () => {
              "use server"
              await signIn("github")
            }}
          >
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors w-full cursor-pointer">
              Sign in with GitHub
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
