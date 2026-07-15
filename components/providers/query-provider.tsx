"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

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

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
