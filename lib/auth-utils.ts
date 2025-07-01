import { getServerSession } from "next-auth"
import { authOptions } from "./auth-config"
import type { UserRole } from "@/types/auth"

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

export function getUserRoleFromValue(roleValue: number): UserRole {
  switch (roleValue) {
    case 1:
      return "Admin"
    case 2:
      return "Partner"
    case 3:
      return "Employer"
    case 4:
      return "Client"
    case 5:
      return "Worker"
    default:
      return "Worker"
  }
}

export function getRoleValueFromName(roleName: string): number {
  switch (roleName.toLowerCase()) {
    case "admin":
      return 1
    case "partner":
      return 2
    case "employer":
      return 3
    case "client":
      return 4
    case "worker":
      return 5
    default:
      return 5
  }
}
