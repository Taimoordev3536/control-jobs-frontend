import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { JWT } from "next-auth/jwt"
import type { LoginResponse, RefreshResponse, User } from "@/types/auth"

const REFRESH_LEAD_SECONDS = 60
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token.refreshToken }),
      },
    )
    if (!res.ok) throw new Error("Refresh failed")
    const json: RefreshResponse = await res.json()
    if (!json?.data?.accessToken) throw new Error("Refresh response invalid")

    return {
      ...token,
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
      accessExpiresAt: Date.now() + json.data.accessExpiresIn * 1000,
      error: undefined,
    }
  } catch {
    return { ...token, error: "RefreshFailed" }
  }
}

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            try {
              const err = await response.json()
              const msg = String(err?.message || "")
              if (response.status === 403 && msg.startsWith("EMAIL_NOT_VERIFIED:")) {
                const email = msg.slice("EMAIL_NOT_VERIFIED:".length) || credentials.email
                throw new Error(`EMAIL_NOT_VERIFIED:${email}`)
              }
            } catch (parseErr: any) {
              if (parseErr?.message?.startsWith?.("EMAIL_NOT_VERIFIED:")) throw parseErr
            }
            return null
          }

          const data: LoginResponse = await response.json()

          if (data.isSuccess && data.data.user) {
            const accessToken = data.data.accessToken || data.data.token
            const refreshToken = data.data.refreshToken
            const accessExpiresIn = data.data.accessExpiresIn || 15 * 60
            return {
              id: data.data.user.id.toString(),
              publicId: data.data.user.publicId,
              email: data.data.user.email,
              name: data.data.user.name,
              firstName: data.data.user.firstName,
              lastName: data.data.user.lastName,
              roleId: data.data.user.roleId,
              partnerId: data.data.user.partnerId,
              role: data.data.user.role,
              accessToken,
              refreshToken,
              accessExpiresAt: Date.now() + accessExpiresIn * 1000,
            }
          }

          return null
        } catch (error: any) {
          if (error?.message?.startsWith?.("EMAIL_NOT_VERIFIED:")) throw error
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        token.accessExpiresAt = (user as any).accessExpiresAt
        token.publicId = (user as any).publicId
        token.roleId = user.roleId
        token.partnerId = user.partnerId
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        return token
      }

      if (
        token.accessExpiresAt &&
        Date.now() < token.accessExpiresAt - REFRESH_LEAD_SECONDS * 1000
      ) {
        return token
      }

      if (!token.refreshToken) return { ...token, error: "RefreshFailed" }
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.publicId = token.publicId as string
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.user.roleId = token.roleId as number
        session.user.partnerId = token.partnerId as number | null
        session.user.role = token.role as User["role"]
        session.user.firstName = token.firstName as string | null
        session.user.lastName = token.lastName as string | null
        if (token.error) session.error = token.error
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
    maxAge: REFRESH_TTL_SECONDS,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
