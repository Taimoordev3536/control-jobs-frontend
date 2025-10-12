"use client"

import { useEffect, useState } from "react"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function ControlAlertTab() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [alertData, setAlertData] = useState<any[]>([])

  const columns: TabTableColumn[] = [
    { key: "holder", label: t("client"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
    { key: "worker", label: t("worker"), sortable: true },
    { key: "notification", label: t("notification"), sortable: false, align: "center" },
  ]

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks-tab`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) throw new Error("Failed to fetch alerts")

        const result = await res.json()
        const formatted = (result.data || []).map((item: any) => ({
          id: item.id,
          holder: item.clientName || item.client?.name || "-",
          job: item.jobName || "-",
          workCenter: item.workCenter?.name || "-",
          worker: item.workers?.map((w: any) => w.name).join(", ") || "-",
          notification: item.alerts?.map((a: any) => a.type).join(", ") || "-", // 👈 Customize this if needed
        }))

        setAlertData(formatted)
      } catch (error) {
        setAlertData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()
  }, [session?.accessToken])

  return (
    <TabTableTemplate
      columns={columns}
      data={alertData}
      loading={isLoading}
      emptyMessage={t("noAlertDataAvailable")}
    />
  )
}
