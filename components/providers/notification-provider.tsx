"use client"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { createSocket } from "@/lib/socket"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

type AlertItem = {
  id?: number
  localId?: string
  type: "CHECK_IN" | "CHECK_OUT"
  jobId: number
  workerId: number
  employerUserId: number
  clientUserId: number
  message: string
  createdAt: string
  meta?: Record<string, any>
}

type Ctx = {
  unreadCount: number
  items: AlertItem[]
  markAllRead: () => void
  dismiss: (localId: string) => void
}

const NotificationCtx = createContext<Ctx | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [items, setItems] = useState<AlertItem[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!session?.accessToken) return
    // Fetch recent alerts (last 2 days)
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/alerts`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          const list: AlertItem[] = (json?.data || []).map((n: any) => ({
            id: n.id,
            localId: `db-${n.id}`,
            type: (n.type === 'CHECK_IN' ? 'CHECK_IN' : 'CHECK_OUT'),
            jobId: n.meta?.jobId || 0,
            workerId: n.meta?.workerId || 0,
            employerUserId: n.meta?.employerUserId || 0,
            clientUserId: n.meta?.clientUserId || 0,
            message: n.message,
            createdAt: n.createdAt,
          }))
          setItems((prev) => {
            // Merge without duplicates
            const byId = new Map<string, AlertItem>()
            for (const a of [...list, ...prev]) byId.set(a.localId || `${a.type}-${a.createdAt}`, a)
            return Array.from(byId.values()).slice(0, 50)
          })
        }
      } catch {}
    })()
    const socket = createSocket(session.accessToken)

    const onNewAlert = (alert: AlertItem) => {
      const localId = alert.id ? `db-${alert.id}` : `rt-${Date.now()}-${Math.random()}`
      setItems((prev) => [{ ...alert, localId }, ...prev].slice(0, 50))
      setUnread((c) => c + 1)
      toast({
        title: alert.type === "CHECK_IN" ? "Worker checked in" : "Worker checked out",
        description: alert.message,
      })
    }

    socket.on("alerts:new", onNewAlert)

    return () => {
      socket.off("alerts:new", onNewAlert)
      socket.disconnect()
    }
  }, [session?.accessToken])

  const value = useMemo<Ctx>(() => ({
    unreadCount: unread,
    items,
    markAllRead: () => setUnread(0),
    dismiss: (localId: string) => setItems((prev) => prev.filter((a) => a.localId !== localId)),
  }), [unread, items])

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationCtx)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
