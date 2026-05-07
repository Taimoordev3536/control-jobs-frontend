"use client"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { createSocket } from "@/lib/socket"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

type AlertType =
  | "CHECK_IN"
  | "CHECK_OUT"
  | "MANUAL_ATTENDANCE_REQUESTED"
  | "MANUAL_ATTENDANCE_APPROVED"
  | "MANUAL_ATTENDANCE_REJECTED"
  | "MANUAL_ATTENDANCE_CANCELLED"
  | "RATE_CHANGE_SCHEDULED"
  | "RATE_CHANGE_CANCELLED"

type AlertItem = {
  id?: number
  publicId?: string
  localId?: string
  type: AlertType
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
            publicId: n.publicId,
            localId: `db-${n.id}`,
            type: n.type as AlertType,
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
      const titleMap: Record<string, string> = {
        CHECK_IN: "Worker checked in",
        CHECK_OUT: "Worker checked out",
        MANUAL_ATTENDANCE_REQUESTED: "Manual attendance requested",
        MANUAL_ATTENDANCE_APPROVED: "Manual attendance approved",
        MANUAL_ATTENDANCE_REJECTED: "Manual attendance rejected",
        MANUAL_ATTENDANCE_CANCELLED: "Manual attendance cancelled",
        RATE_CHANGE_SCHEDULED: "Tariff change scheduled",
        RATE_CHANGE_CANCELLED: "Tariff change cancelled",
      }
      const variantMap: Record<string, "default" | "success" | "destructive"> = {
        CHECK_IN: "success",
        CHECK_OUT: "success",
        MANUAL_ATTENDANCE_REQUESTED: "default",
        MANUAL_ATTENDANCE_APPROVED: "success",
        MANUAL_ATTENDANCE_REJECTED: "destructive",
        MANUAL_ATTENDANCE_CANCELLED: "default",
        RATE_CHANGE_SCHEDULED: "default",
        RATE_CHANGE_CANCELLED: "default",
      }
      toast({
        title: titleMap[alert.type] || "New notification",
        description: alert.message,
        variant: variantMap[alert.type] || "default",
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
    dismiss: (localId: string) => {
      const target = items.find((a) => a.localId === localId)
      // Drop locally first so the click feels instant.
      setItems((prev) => prev.filter((a) => a.localId !== localId))
      // Persist the dismissal so it doesn't reappear on refresh. Live (WS-
      // pushed) alerts that haven't been refetched yet won't have a publicId
      // — those will resurface on next /alerts fetch with their real id and
      // can be dismissed again then.
      if (target?.publicId && session?.accessToken) {
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/alerts/${target.publicId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        ).catch(() => {
          /* swallow — local dismissal still wins UX-wise */
        })
      }
    },
  }), [unread, items, session?.accessToken])

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationCtx)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
