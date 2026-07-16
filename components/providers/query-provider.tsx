"use client"

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { invalidateAccessTokenCache } from "@/lib/api"

// Whenever the signed-in identity LEAVES a user — logout, the forced sign-out
// on a 401/RefreshFailed, the invite-accept sign-out, or a switch to a
// different account — drop the module-scoped API token cache and every React
// Query entry, no matter which code path triggered it. Without this the
// previous account's cached token/data bled into the next session (backend
// resolved the wrong user -> 401/404/500 or empty lists until a full page
// reload reset the module cache). This is the app-wide safety net; login()
// also clears explicitly so the very first post-login fetch uses the new token.
function IdentityReset() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const prevUserId = useRef<string | null | undefined>(undefined)
  const uid = (session?.user as any)?.id ?? null

  useEffect(() => {
    // Only act when moving AWAY from a real user (logout / account switch).
    // undefined (first run) and null->user (login) are intentionally skipped
    // so a normal page load or fresh login doesn't wipe freshly-fetched data.
    if (prevUserId.current != null && prevUserId.current !== uid) {
      invalidateAccessTokenCache()
      queryClient.clear()
    }
    prevUserId.current = uid
  }, [uid, queryClient])

  return null
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per app lifetime (useState so React strict-mode double-render
  // doesn't create two).
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Fresh for 30s: navigating back to a screen renders cached data
            // instantly instead of refetching from zero.
            staleTime: 30_000,
            // The old fetch-in-useEffect pattern refetched everything when
            // the tab regained focus; keep that off by default.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <IdentityReset />
      {children}
    </QueryClientProvider>
  )
}
