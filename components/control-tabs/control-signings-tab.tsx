"use client"

import { useEffect, useState } from "react"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function ControlSigningsTab({
  showFilters,
  onShowFiltersChange,
  filters,
  onFiltersChange,
}: {
  showFilters?: boolean
  onShowFiltersChange?: (v: boolean) => void
  filters?: Record<string, string>
  onFiltersChange?: (f: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [signingsData, setSigningsData] = useState<any[]>([])

  const columns: TabTableColumn[] = [
    { key: "holder", label: t("client"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
    { key: "worker", label: t("worker"), sortable: true },
    { key: "hours", label: t("hours"), sortable: true },
    { key: "notification", label: t("notification"), sortable: false, align: "center" },
  ]

  useEffect(() => {
    const fetchSignings = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks-tab`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) throw new Error("Failed to fetch signings")

        const result = await res.json()

        const formatted = (result.data || []).map((item: any) => ({
          id: item.id,
          holder: item.clientName || item.client?.name || "-",
          job: item.jobName || "-",
          workCenter: item.workCenter?.name || "-",
          worker: item.workers?.map((w: any) => w.name || w.code).join(", ") || "-",
          hours: "-", // Placeholder until backend returns hours (check-in/out logic)
          notification: "", // Optional logic for notifications
        }))

        setSigningsData(formatted)
      } catch (error) {
        setSigningsData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSignings()
  }, [session?.accessToken])

  return (
    <TabTableTemplate
      columns={columns}
      data={signingsData}
      loading={isLoading}
      emptyMessage={t("noSigningsDataAvailable")}
      showFilters={showFilters}
      onShowFiltersChange={onShowFiltersChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
    />
  )
}
