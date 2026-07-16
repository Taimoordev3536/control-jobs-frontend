"use client"

import { SessionProvider, signOut, useSession } from "next-auth/react"
import { useEffect, type ReactNode } from "react"

interface AuthProviderProps {
  children: ReactNode
}

function RefreshFailureWatcher() {
  const { data } = useSession()
  useEffect(() => {
    if ((data as any)?.error === "RefreshFailed") {
      signOut({ callbackUrl: "/login" })
    }
  }, [data])
  return null
}

// Decode a JWT's `exp` claim (ms). Returns 0 if it can't be read.
function jwtExpiryMs(token: string): number {
  try {
    const part = token.split(".")[1]
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

// Proactively rotate the access token shortly before it expires so
// `session.accessToken` is never stale for ANY consumer — including the many
// components that read it directly for a raw `fetch` (which would otherwise
// send an expired token and get a 401 "Invalid token or user not found").
// Fires ~40s before expiry: inside the backend's 60s refresh-lead window (so
// the NextAuth `jwt` callback actually rotates the token) with enough margin
// for the refresh round-trip. A successful refresh changes the token, which
// re-runs this effect and schedules the next rotation. `refetchInterval` below
// stays as a backstop.
function TokenAutoRefresh() {
  const { data: session, update } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  useEffect(() => {
    if (!token) return
    const exp = jwtExpiryMs(token)
    if (!exp) return
    const fireIn = Math.max(0, exp - Date.now() - 40_000)
    const timer = setTimeout(() => {
      update()
    }, fireIn)
    return () => clearTimeout(timer)
  }, [token, update])
  return null
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Refetch every 10 min and on window focus so the NextAuth `jwt` callback
  // gets a chance to rotate the 15-min access token before it expires.
  return (
    <SessionProvider refetchInterval={600} refetchOnWindowFocus>
      <RefreshFailureWatcher />
      <TokenAutoRefresh />
      {children}
    </SessionProvider>
  )
}
