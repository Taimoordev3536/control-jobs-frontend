"use client"

import DataListTemplate from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"

export default function SupportLogsPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/logs`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) throw new Error("Failed to fetch logs")
      const data = await res.json()
      setLogs(
        (data.data || []).map((r: any) => ({
          id: r.publicId || r.id,
          date: formatLocalDateTime(r.createdAt),
          actor: r.actorName || "-",
          action: r.action || "-",
          detail: r.detail || "-",
        })),
      )
    } catch (err) {
      console.error("Error fetching logs:", err)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "actor", label: t("requester"), sortable: true },
    { key: "action", label: t("action") || "Action", sortable: true },
    { key: "detail", label: t("message"), sortable: false },
  ]

  return (
    <DataListTemplate
      title={t("logs")}
      data={logs}
      columns={columns}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noLogsFound") || "No logs found"}
    />
  )
}
