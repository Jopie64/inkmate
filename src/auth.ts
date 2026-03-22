import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (profile && profile.login) {
        token.githubLogin = profile.login
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken as string
      if (token.githubLogin) {
        session.user.name = token.githubLogin as string
      }
      return session
    }
  }
})
