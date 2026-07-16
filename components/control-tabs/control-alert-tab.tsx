"use client"

import { useQuery } from "@tanstack/react-query"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function ControlAlertTab({
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
    { key: "notification", label: t("notification"), sortable: false, align: "center" },
  ]

  const { data: alertData = [], isLoading } = useQuery<any[]>({
    queryKey: ["control", "tasks-tab", "alerts"],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks-tab`, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch alerts")
      const result = await res.json()
      return (result.data || []).map((item: any) => ({
        id: item.id,
        holder: item.clientName || item.client?.name || "-",
        job: item.jobName || "-",
        workCenter: item.workCenter?.name || "-",
        worker: item.workers?.map((w: any) => w.name).join(", ") || "-",
        notification: item.alerts?.map((a: any) => a.type).join(", ") || "-",
      }))
    },
  })

  return (
    <TabTableTemplate
      columns={columns}
      data={alertData}
      loading={isLoading}
      emptyMessage={t("noAlertDataAvailable")}
      showFilters={showFilters}
      onShowFiltersChange={onShowFiltersChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
    />
  )
}
