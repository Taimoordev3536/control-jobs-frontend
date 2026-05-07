import type { DefaultSession, DefaultUser } from "next-auth"
import type { User } from "./auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      publicId: string
      roleId: number
      partnerId: number | null
      role: User["role"]
      firstName: string | null
      lastName: string | null
    } & DefaultSession["user"]
    accessToken: string
    refreshToken: string
    error?: "RefreshFailed"
  }

  interface User extends DefaultUser {
    roleId: number
    partnerId: number | null
    role: User["role"]
    firstName: string | null
    lastName: string | null
    accessToken: string
    refreshToken: string
    accessExpiresAt: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    refreshToken: string
    accessExpiresAt: number
    publicId: string
    roleId: number
    partnerId: number | null
    role: User["role"]
    firstName: string | null
    lastName: string | null
    error?: "RefreshFailed"
  }
}
