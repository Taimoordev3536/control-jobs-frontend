import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { LoginResponse, User } from "@/types/auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data: LoginResponse = await response.json()

          if (data.isSuccess && data.data.user) {
            return {
              id: data.data.user.id.toString(),
              email: data.data.user.email,
              name: data.data.user.name,
              firstName: data.data.user.firstName,
              lastName: data.data.user.lastName,
              roleId: data.data.user.roleId,
              partnerId: data.data.user.partnerId,
              role: data.data.user.role,
              accessToken: data.data.token,
            }
          }

          return null
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.roleId = user.roleId
        token.partnerId = user.partnerId
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.accessToken = token.accessToken as string
        session.user.roleId = token.roleId as number
        session.user.partnerId = token.partnerId as number | null
        session.user.role = token.role as User["role"]
        session.user.firstName = token.firstName as string | null
        session.user.lastName = token.lastName as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
