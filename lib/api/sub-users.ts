import { getSession } from "next-auth/react"

export type SubUserPermission = "EDIT" | "VIEW_ONLY"
export type SubUserStatus = "active" | "pending" | "inactive"
export type SubUserScope = "partner" | "employer" | "client"

export interface SubUser {
  id: number
  junctionId: number
  scope: SubUserScope
  firstName: string | null
  lastName: string | null
  name: string
  email: string
  permission: SubUserPermission | null
  isActive: boolean
  status: SubUserStatus
  createdAt: string
  inviteLink: string | null
}

export interface SubUserContext {
  isSubUser: boolean
  permission?: SubUserPermission | null
  parentUserId?: number | null
  scopeType?: SubUserScope | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

async function authedFetch(path: string, init: RequestInit = {}) {
  const session = await getSession()
  const token = (session as any)?.accessToken
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.isSuccess === false) {
    throw new Error(body?.message || `Request failed: ${res.status}`)
  }
  return body
}

export async function listSubUsers(): Promise<SubUser[]> {
  const body = await authedFetch("/sub-users", { method: "GET" })
  return body.data || []
}

export async function createSubUser(input: {
  email: string
  firstName: string
  lastName: string
  permission: SubUserPermission
}): Promise<{ user: { id: number }; inviteToken: string; inviteLink: string }> {
  const body = await authedFetch("/sub-users", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return body.data
}

export async function updateSubUser(
  id: number,
  input: { permission?: SubUserPermission; isActive?: boolean },
): Promise<SubUser> {
  const body = await authedFetch(`/sub-users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return body.data
}

export async function deleteSubUser(id: number): Promise<void> {
  await authedFetch(`/sub-users/${id}`, { method: "DELETE" })
}

export async function resetSubUserPassword(id: number): Promise<{ inviteToken: string; inviteLink: string }> {
  const body = await authedFetch(`/sub-users/${id}/reset-password`, { method: "POST" })
  return body.data
}

export async function resendInvite(id: number): Promise<{ inviteToken: string; inviteLink: string }> {
  const body = await authedFetch(`/sub-users/${id}/resend-invite`, { method: "POST" })
  return body.data
}

export async function getSubUserContext(): Promise<SubUserContext> {
  const body = await authedFetch("/auth/me/sub-user-context", { method: "GET" })
  return body.data || { isSubUser: false }
}

export async function acceptInvite(token: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sub-users/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.isSuccess === false) {
    throw new Error(body?.message || "Failed to accept invite")
  }
}
