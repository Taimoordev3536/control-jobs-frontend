"use client"

import { useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { useNotifications } from "@/components/providers/notification-provider"
import { useTranslation } from "@/hooks/use-translation"
import { apiFetch } from "@/lib/api"

const SEVERITY = {
  INFO: {
    bg: "bg-[#f3edf9] dark:bg-[#2a1b3d]",
    border: "border-[#662D91]/20 dark:border-[#662D91]/50",
    line: "border-[#662D91] dark:border-purple-400",
  },
  WARNING: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800/60",
    line: "border-amber-500 dark:border-amber-400",
  },
  CRITICAL: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800/60",
    line: "border-red-600 dark:border-red-400",
  },
} as const

function keyOf(item: any): string {
  return item.meta?.announcementPublicId || item.publicId || String(item.localId)
}

export function AnnouncementBanner() {
  const { items } = useNotifications()
  const { t } = useTranslation("announcements")
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const announcements = useMemo(
    () =>
      items.filter(
        (a) =>
          a.type === "ANNOUNCEMENT" &&
          !a.bannerDismissed &&
          !hidden.has(keyOf(a)),
      ),
    [items, hidden],
  )

  if (announcements.length === 0) return null

  // Dismissal is persisted server-side (per user), so it survives re-login and
  // other devices. The local set just hides it instantly before the next fetch.
  const hide = (item: any) => {
    setHidden((prev) => new Set(prev).add(keyOf(item)))
    if (item.publicId) {
      apiFetch(`/alerts/${item.publicId}/dismiss-banner`, {
        method: "POST",
      }).catch(() => {})
    }
  }

  const startDrag = (e: React.PointerEvent) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const offX = e.clientX - rect.left
    const offY = e.clientY - rect.top
    const move = (ev: PointerEvent) => {
      const x = Math.min(Math.max(8, ev.clientX - offX), window.innerWidth - 80)
      const y = Math.min(Math.max(8, ev.clientY - offY), window.innerHeight - 40)
      setPos({ x, y })
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={startDrag}
      className={`fixed z-[100] w-[270px] max-w-[calc(100vw-1rem)] cursor-move touch-none select-none space-y-2 ${
        pos ? "" : "right-4 top-20"
      }`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      {announcements.map((a) => {
        const sev = (a.meta?.severity as keyof typeof SEVERITY) || "INFO"
        const s = SEVERITY[sev] || SEVERITY.INFO
        return (
          <div
            key={keyOf(a)}
            className={`relative rounded-lg border ${s.border} ${s.bg} py-2 pl-3 pr-7 shadow-lg`}
          >
            <button
              aria-label="dismiss announcement"
              className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => hide(a)}
            >
              <X className="h-4 w-4" />
            </button>
            <div
              className={`inline-block border-b-2 pb-px font-semibold leading-none text-foreground ${s.line}`}
            >
              {a.meta?.subject || t("announcements")}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{a.message}</p>
          </div>
        )
      })}
    </div>
  )
}
