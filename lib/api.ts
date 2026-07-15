import { getSession, signOut } from "next-auth/react"
import { getStoredImpersonationToken } from "./api/impersonate"

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
    this.name = "ApiError"
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  /** Skip Authorization header for genuinely public endpoints. */
  unauthenticated?: boolean
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

async function buildRequest(
  path: string,
  options: ApiFetchOptions,
  accessToken: string | null,
): Promise<Request> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`
  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (accessToken && !options.unauthenticated) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }
  const init: RequestInit = {
    ...options,
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === "string" || options.body instanceof FormData
          ? (options.body as BodyInit)
          : JSON.stringify(options.body),
  }
  return new Request(url, init)
}

async function readError(res: Response): Promise<ApiError> {
  let body: any = null
  try {
    body = await res.clone().json()
  } catch {
    try {
      body = await res.text()
    } catch {
      /* ignore */
    }
  }
  const message =
    (body && typeof body === "object" && (body.message || body.error)) ||
    (typeof body === "string" && body) ||
    res.statusText ||
    "Request failed"
  return new ApiError(res.status, message, body)
}

// getSession() is a network round-trip to /api/auth/session, and every
// apiFetch was paying it — doubling the latency of every API call. Cache
// the token until shortly before its JWT exp (the backend validates only
// exp, so an unexpired token can't go stale server-side), and share one
// in-flight session lookup between concurrent calls.
let cachedToken: string | null = null
let cachedTokenValidUntil = 0
let inflightTokenFetch: Promise<string | null> | null = null

const TOKEN_EXP_MARGIN_MS = 30_000

function jwtExpiryMs(token: string): number {
  try {
    const part = token.split(".")[1]
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

export function invalidateAccessTokenCache() {
  cachedToken = null
  cachedTokenValidUntil = 0
}

async function fetchFreshAccessToken(): Promise<string | null> {
  const session = await getSession()
  if (session?.error === "RefreshFailed") {
    invalidateAccessTokenCache()
    await signOut({ callbackUrl: "/login" })
    throw new ApiError(401, "Session expired")
  }
  const token = session?.accessToken ?? null
  if (token) {
    const exp = jwtExpiryMs(token)
    if (exp > Date.now() + TOKEN_EXP_MARGIN_MS) {
      cachedToken = token
      cachedTokenValidUntil = exp - TOKEN_EXP_MARGIN_MS
    }
  }
  return token
}

export async function getAccessToken(unauthenticated?: boolean): Promise<string | null> {
  if (unauthenticated) return null
  if (typeof window !== "undefined") {
    const impToken = getStoredImpersonationToken()
    if (impToken) return impToken
  }
  if (cachedToken && Date.now() < cachedTokenValidUntil) return cachedToken
  if (!inflightTokenFetch) {
    inflightTokenFetch = fetchFreshAccessToken().finally(() => {
      inflightTokenFetch = null
    })
  }
  return inflightTokenFetch
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const accessToken = await getAccessToken(options.unauthenticated)
  const req = await buildRequest(path, options, accessToken)
  const res = await fetch(req)

  if (res.status === 401 && !options.unauthenticated) {
    invalidateAccessTokenCache()
    await signOut({ callbackUrl: "/login" })
    throw new ApiError(401, "Session expired")
  }

  if (!res.ok) throw await readError(res)
  if (res.status === 204) return undefined as T
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return res.json()
  return (await res.text()) as unknown as T
}

export async function apiFetchRaw(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const accessToken = await getAccessToken(options.unauthenticated)
  const req = await buildRequest(path, options, accessToken)
  const res = await fetch(req)

  if (res.status === 401 && !options.unauthenticated) {
    invalidateAccessTokenCache()
    await signOut({ callbackUrl: "/login" })
    throw new ApiError(401, "Session expired")
  }

  return res
}
