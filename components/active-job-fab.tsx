"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Clock, Coffee, ChevronRight } from "lucide-react"
import { useActiveJob } from "@/hooks/use-active-job"
import { useTranslation } from "@/hooks/use-translation"

/**
 * Floating shortcut back to the running session.
 *
 * Renders on every dashboard page for a worker who is checked in, and nowhere
 * else — not for other roles, not without an open session, and not on
 * /dashboard itself, where the job card is already the first thing on screen.
 */
export function ActiveJobFab() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation("worker-dashboard")
  const activeJob = useActiveJob()

  const onDashboard = pathname === "/dashboard"

  // The label counts up, so it needs a re-render each second.
  const [, setTick] = useState(0)
  const live = !!activeJob && !activeJob.onBreak
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [live])

  // On the dashboard the card leads the page, so the pill would just duplicate
  // what is already on screen — until you scroll down and it is gone.
  const [scrolledAway, setScrolledAway] = useState(false)
  useEffect(() => {
    if (!onDashboard) {
      setScrolledAway(false)
      return
    }
    const onScroll = () => setScrolledAway(window.scrollY > 280)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [onDashboard])

  if (!activeJob) return null
  if (onDashboard && !scrolledAway) return null

  const label = activeJob.onBreak
    ? t("onBreak") || "On break"
    : formatElapsed(activeJob.checkInTime, activeJob.breakMinutes)

  return (
    <button
      type="button"
      onClick={() => {
        // Already here — navigating would be a no-op that leaves the worker
        // looking at the same scrolled-down view.
        if (onDashboard) window.scrollTo({ top: 0, behavior: "smooth" })
        else router.push("/dashboard")
      }}
      aria-label={t("goToCurrentJob") || "Go to my current job"}
      // bottom-20 on phones clears the per-page FABs that sit at bottom-4.
      // z-[90] keeps it above the sidebar/header (z-40) and those FABs (z-50),
      // but below banners, toasts and every modal.
      className="fixed z-[90] bottom-20 right-4 sm:bottom-6 sm:right-6
                 flex items-center gap-2 rounded-full pl-4 pr-3 py-2.5
                 bg-[#662D91] text-white shadow-xl
                 hover:bg-[#57267c] active:scale-95 transition
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                 focus-visible:ring-[#662D91] max-w-[calc(100vw-2rem)]"
    >
      {activeJob.onBreak ? (
        <Coffee className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <span className="font-semibold tabular-nums text-sm truncate">{label}</span>
      <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />
    </button>
  )
}

/** Working time = elapsed since check-in, minus completed breaks. */
function formatElapsed(checkInTime: Date, breakMinutes: number): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - checkInTime.getTime()) / 1000) - breakMinutes * 60,
  )
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
