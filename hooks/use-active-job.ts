"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

export interface ActiveJobInfo {
  /** Job publicId — used to navigate. */
  jobId: string
  jobName: string
  /** Check-in instant. */
  checkInTime: Date
  /** Completed break minutes, excluded from working time. */
  breakMinutes: number
  onBreak: boolean
}

/**
 * The worker's currently open session, if any — for UI outside the dashboard
 * (the floating "back to my job" pill).
 *
 * Uses /jobs/worker/active-session rather than /jobs/worker/day: the latter
 * only reports sessions that STARTED today, so an overnight shift vanished
 * from it after midnight while still being open.
 *
 * Its own query key, so it cannot collide with the dashboard's cache.
 */
export function useActiveJob(): ActiveJobInfo | null {
  const { session, getUserRole } = useAuth()
  const enabled = !!session?.accessToken && getUserRole() === "worker"

  const { data } = useQuery<any>({
    queryKey: ["worker", "active-session"],
    enabled,
    queryFn: () => apiFetch<any>("/jobs/worker/active-session"),
    // The session can end in another tab or on another device.
    refetchInterval: 60_000,
  })

  // TransformInterceptor unwraps our `{hasActiveSession, data}` to `data`, so an
  // open session arrives as body.data and "none" arrives without a checkInTime.
  // The same expression holds if the interceptor is ever removed.
  const info = data?.data
  if (!info?.checkInTime) return null

  return {
    jobId: String(info.jobId ?? ""),
    jobName: info.jobName || "",
    checkInTime: new Date(info.checkInTime),
    breakMinutes: Number(info.totalBreakMinutes) || 0,
    onBreak: !!info.onBreak,
  }
}
