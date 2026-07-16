"use client"

import { useQuery } from "@tanstack/react-query"
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

  const columns: TabTableColumn[] = [
    { key: "holder", label: t("client"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
    { key: "worker", label: t("worker"), sortable: true },
    { key: "hours", label: t("hours"), sortable: true },
    { key: "notification", label: t("notification"), sortable: false, align: "center" },
  ]

  const { data: signingsData = [], isLoading } = useQuery<any[]>({
    queryKey: ["control", "tasks-tab", "signings"],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks-tab`, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch signings")
      const result = await res.json()
      return (result.data || []).map((item: any) => ({
        id: item.id,
        holder: item.clientName || item.client?.name || "-",
        job: item.jobName || "-",
        workCenter: item.workCenter?.name || "-",
        worker: item.workers?.map((w: any) => w.name || w.code).join(", ") || "-",
        hours: "-", // Placeholder until backend returns hours (check-in/out logic)
        notification: "",
      }))
    },
  })

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
