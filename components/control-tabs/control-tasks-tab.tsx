// "use client"

// import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
// import { useTranslation } from "@/hooks/use-translation"

// export default function ControlTasksTab() {
//   const { t } = useTranslation()

//   const columns: TabTableColumn[] = [
//     { key: "holder", label: t("client"), sortable: true },
//     { key: "job", label: t("job"), sortable: true },
//     { key: "workCenter", label: t("workCenter"), sortable: true },
//     { key: "worker", label: t("worker"), sortable: true },
//     { key: "tasks", label: t("tasks"), sortable: true },
//     { key: "notification", label: t("notification"), sortable: false, align: "center" },
//   ]

//   // Sample data - replace with actual data from API
//   const data: any[] = []

//   return <TabTableTemplate columns={columns} data={data} emptyMessage={t("noTasksDataAvailable")} />
// }


"use client"

import { useEffect, useState } from "react"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function ControlTasksTab({
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
  const [tasksData, setTasksData] = useState<any[]>([])

  const columns: TabTableColumn[] = [
    { key: "holder", label: t("client"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
    { key: "worker", label: t("worker"), sortable: true },
    { key: "tasks", label: t("tasks"), sortable: true },
    { key: "notification", label: t("notification"), sortable: false, align: "center" },
  ]

  useEffect(() => {
    const fetchTasks = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks-tab`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) throw new Error("Failed to fetch tasks")

        const result = await res.json()
        const formatted = (result.data || []).map((item: any) => ({
          id: item.id,
          // Prefer backend-provided clientName (which falls back to employer name when client is null)
          holder: item.clientName || item.client?.name || "-",
          job: item.jobName || "-",
          workCenter: item.workCenter?.name || "-",
          worker: item.workers?.map((w: any) => w.name).join(", ") || "-", // 👈 this is correct placement
          tasks: item.tasks?.map((t: any) => t.name).join(", ") || "-",
          notification: "", // Optional logic for notifications
        }))

        setTasksData(formatted)
      } catch (error) {
        setTasksData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [session?.accessToken])

  return (
    <TabTableTemplate
      columns={columns}
      data={tasksData}
      loading={isLoading}
      emptyMessage={t("noTasksDataAvailable")}
      showFilters={showFilters}
      onShowFiltersChange={onShowFiltersChange}
      filters={filters}
      onFiltersChange={onFiltersChange}
    />
  )
}
