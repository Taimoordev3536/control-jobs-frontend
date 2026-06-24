"use client"

import DataListTemplate from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"

export default function SupportTicketsPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTickets = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/support/tickets`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) throw new Error("Failed to fetch tickets")
      const data = await res.json()
      setTickets(
        (data.data || []).map((r: any) => ({
          id: r.publicId || r.id,
          date: formatLocalDateTime(r.createdAt),
          requester: r.requesterName || "-",
          role: r.requesterRole || "-",
          message: r.message || "-",
          status: r.status || "OPEN",
        })),
      )
    } catch (err) {
      console.error("Error fetching tickets:", err)
      setTickets([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "requester", label: t("requester"), sortable: true },
    { key: "role", label: t("role"), sortable: true },
    { key: "message", label: t("message"), sortable: false },
    { key: "status", label: t("status"), sortable: true, align: "center" as const },
  ]

  return (
    <DataListTemplate
      title={t("tickets")}
      data={tickets}
      columns={columns}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noTicketsFound") || "No tickets found"}
    />
  )
}
