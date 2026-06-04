import { getSession } from "next-auth/react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export interface ImpersonateResponse {
  token: string
  user: {
    id: number
    publicId: string
    email: string
    name: string
    firstName: string | null
    lastName: string | null
    roleId: number
    role: { id: number; name: string; value: number }
    partnerId?: number | null
    employer?: {
      id: number
      publicId: string
      name: string
      typeId: number
      subTypeId: number
    }
  }
}

export interface ImpersonationContext {
  isImpersonating: boolean
  impersonatorUserId?: number | null
  impersonatorRole?: string | null
  impersonatorLogoUrl?: string | null
}

/**
 * Call POST /auth/impersonate to get a short-lived token for the target user.
 * Uses the current session's token for authorization.
 * @param targetEntityType - 'partner' | 'employer' | 'client' | 'worker'
 * @param targetEntityPublicId - The publicId of the target entity (not the user)
 */
export async function impersonateUser(
  targetEntityType: string,
  targetEntityPublicId: string,
  accessToken?: string,
): Promise<ImpersonateResponse> {
  let token = accessToken
  if (!token) {
    const session = await getSession()
    token = (session as any)?.accessToken
  }

  const res = await fetch(`${API_BASE}/auth/impersonate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ targetEntityType, targetEntityPublicId }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.isSuccess === false) {
    throw new Error(body?.message || `Impersonation failed: ${res.status}`)
  }
  return body.data
}

/**
 * Fetch the impersonation context for the current session (used in impersonated tabs).
 */
export async function getImpersonationContext(accessToken: string): Promise<ImpersonationContext> {
  const res = await fetch(`${API_BASE}/auth/me/impersonation-context`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.isSuccess === false) {
    return { isImpersonating: false }
  }
  return body.data || { isImpersonating: false }
}

const KEYS = {
  token: "impersonation_token",
  user: "impersonation_user",
  context: "impersonation_context",
} as const

const IMP_COOKIE = "cj-imp-token"
const IMP_COOKIE_MAX_AGE = 60 * 60

function setImpCookie(token: string) {
  if (typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${IMP_COOKIE}=${encodeURIComponent(
    token,
  )}; path=/; SameSite=Strict; Max-Age=${IMP_COOKIE_MAX_AGE}${secure}`
}

function clearImpCookie() {
  if (typeof document === "undefined") return
  document.cookie = `${IMP_COOKIE}=; path=/; SameSite=Strict; Max-Age=0`
}

export function storeImpersonationSession(token: string, user: any, context: ImpersonationContext) {
  sessionStorage.setItem(KEYS.token, token)
  sessionStorage.setItem(KEYS.user, JSON.stringify(user))
  sessionStorage.setItem(KEYS.context, JSON.stringify(context))
  setImpCookie(token)
}

export function getStoredImpersonationToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(KEYS.token)
}

export function getStoredImpersonationUser(): any | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(KEYS.user)
  return raw ? JSON.parse(raw) : null
}

export function getStoredImpersonationContext(): ImpersonationContext | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(KEYS.context)
  return raw ? JSON.parse(raw) : null
}

export function clearImpersonationSession() {
  sessionStorage.removeItem(KEYS.token)
  sessionStorage.removeItem(KEYS.user)
  sessionStorage.removeItem(KEYS.context)
  clearImpCookie()
}

export function isImpersonationSession(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(KEYS.token) !== null
}
