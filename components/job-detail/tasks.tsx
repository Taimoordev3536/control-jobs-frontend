"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface TasksTabProps {
  jobId: string
  jobData?: any
}

export default function TasksTab({ jobId, jobData }: TasksTabProps) {
  const { t } = useTranslation("job-detail")
  const { session } = useAuth()
  const router = useRouter() // Added router for navigation to task detail page

  const columns: TabTableColumn[] = [
    { key: "jobName", label: t("jobName"), sortable: true },
    { key: "clientName", label: t("clientName"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
    { key: "workerName", label: t("workerName"), sortable: true },
    { key: "name", label: t("taskName"), sortable: true },
    { key: "periodicity", label: t("periodicity"), sortable: true },
  ]

  const handleRowClick = (row: any) => {
    router.push(`/tasks/${row.id}`)
  }

  const workerId = jobData?.workers?.[0]?.id || (session as any)?.user?.workerId || (session as any)?.user?.id

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["jobs", jobId, "tasks", workerId],
    enabled: !!session?.accessToken && !!jobId && !!workerId,
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

      const fetchTasksWithWorkerId = async (wid: any): Promise<any> => {
        const url = `${baseUrl}/jobs/${jobId}/worker/${wid}/tasks`
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session!.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) {
          const text = await res.text().catch(() => "<no body>")
          console.error("TasksTab: fetch failed", { status: res.status, body: text, workerId: wid })
          throw new Error("Failed to fetch tasks for job and worker")
        }
        return await res.json()
      }

      let result = await fetchTasksWithWorkerId(workerId)

      const backendIsSuccess = result?.data?.isSuccess ?? result?.isSuccess
      const errorCode = result?.data?.errorCode || result?.errorCode
      const isWorkerNotAssigned =
        errorCode === "WORKER_NOT_ASSIGNED" ||
        (typeof result?.message === "string" && result.message.includes("not assigned to this job")) ||
        (typeof result?.data?.message === "string" && result.data.message.includes("not assigned to this job"))

      const allowedWorkers = result?.data?.allowedWorkers || result?.data?.data?.allowedWorkers || []

      if (backendIsSuccess === false || isWorkerNotAssigned) {
        if (isWorkerNotAssigned && allowedWorkers?.length > 0) {
          result = await fetchTasksWithWorkerId(allowedWorkers[0].id)
          if (result?.isSuccess === false) return []
        } else {
          return []
        }
      }

      let jobName = "-"
      let clientName = "-"
      let workCenter = "-"
      let workerName = "-"
      let tasks: any[] = []

      if (result?.data && Array.isArray(result.data.tasks)) {
        tasks = result.data.tasks
        jobName = result.data.jobName || "-"
        clientName = result.data.clientName || "-"
        workCenter = result.data.workCenter || "-"
        workerName = result.data.workerName || "-"
      }

      return (tasks || []).map((task: any) => ({
        id: task.publicId || task.id,
        jobName: jobName || "-",
        clientName: clientName || "-",
        workCenter: workCenter || "-",
        workerName: workerName || "-",
        name: task.name || "-",
        periodicity: task.periodicity
          ? `${task.periodicity}${task.periodicityValue ? ` (${task.periodicityValue})` : ""}`
          : "-",
        periodicityValue: task.periodicityValue || null,
        interval: task.interval || null,
      }))
    },
  })

  return (
    <div className="p-6">
      <TabTableTemplate
        columns={columns}
        data={rows}
        loading={isLoading}
        emptyMessage={t("noTasksDataAvailable")}
        itemsPerPage={10}
        onRowClick={handleRowClick}
      />
    </div>
  )
}
