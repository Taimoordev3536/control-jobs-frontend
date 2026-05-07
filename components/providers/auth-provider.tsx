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

export function AuthProvider({ children }: AuthProviderProps) {
  // Refetch every 10 min and on window focus so the NextAuth `jwt` callback
  // gets a chance to rotate the 15-min access token before it expires.
  return (
    <SessionProvider refetchInterval={600} refetchOnWindowFocus>
      <RefreshFailureWatcher />
      {children}
    </SessionProvider>
  )
}
