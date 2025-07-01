import type { DefaultSession, DefaultUser } from "next-auth"
import type { User } from "./auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roleId: number
      partnerId: number | null
      role: User["role"]
      firstName: string | null
      lastName: string | null
    } & DefaultSession["user"]
    accessToken: string
  }

  interface User extends DefaultUser {
    roleId: number
    partnerId: number | null
    role: User["role"]
    firstName: string | null
    lastName: string | null
    accessToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    roleId: number
    partnerId: number | null
    role: User["role"]
    firstName: string | null
    lastName: string | null
  }
}
