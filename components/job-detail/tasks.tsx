"use client"

import { useEffect, useState } from "react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])

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

  useEffect(() => {
    const fetchTasks = async () => {
      console.debug("TasksTab: fetchTasks start", { jobId, jobData, session })

      if (!session?.accessToken) {
        console.debug("TasksTab: no accessToken, skipping fetch")
        setRows([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        let workerId = jobData?.workers?.[0]?.id

        if (!workerId) {
          workerId = (session as any)?.user?.workerId || (session as any)?.user?.id
          console.debug("TasksTab: workerId fallback used", { workerId })
        }

        if (!workerId) {
          console.debug("TasksTab: no workerId available, aborting fetch")
          setRows([])
          setIsLoading(false)
          return
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const url = `${baseUrl}/jobs/${jobId}/worker/${workerId}/tasks`
        console.debug("TasksTab: fetching", { url })

        const fetchTasksWithWorkerId = async (workerId: any): Promise<any> => {
          const url = `${baseUrl}/jobs/${jobId}/worker/${workerId}/tasks`
          console.debug("TasksTab: fetching", { url, workerId })

          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          })

          if (!res.ok) {
            const text = await res.text().catch(() => "<no body>")
            console.error("TasksTab: fetch failed", { status: res.status, body: text, workerId })
            throw new Error("Failed to fetch tasks for job and worker")
          }

          return await res.json()
        }

        let result = await fetchTasksWithWorkerId(workerId)
        console.debug("TasksTab: fetch result", result)

        const backendError = result?.data?.developerError || result?.developerError
        const backendIsSuccess = result?.data?.isSuccess ?? result?.isSuccess
        const errorCode = result?.data?.errorCode || result?.errorCode

        const isWorkerNotAssigned =
          errorCode === "WORKER_NOT_ASSIGNED" ||
          (typeof result?.message === "string" && result.message.includes("not assigned to this job")) ||
          (typeof result?.data?.message === "string" && result.data.message.includes("not assigned to this job"))

        console.debug("TasksTab: Raw response structure", {
          resultKeys: Object.keys(result || {}),
          dataKeys: Object.keys(result?.data || {}),
          message: result?.message,
          isSuccess: result?.isSuccess,
          tasks: result?.data?.tasks,
          hasTasks: Array.isArray(result?.data?.tasks),
          tasksCount: Array.isArray(result?.data?.tasks) ? result.data.tasks.length : 0,
        })

        const allowedWorkers = result?.data?.allowedWorkers || result?.data?.data?.allowedWorkers || []

        const hasTasks = Array.isArray(result?.data?.tasks)
        const hasTasksWithItems = hasTasks && result.data.tasks.length > 0

        if (backendIsSuccess === false || isWorkerNotAssigned) {
          console.error("TasksTab: backend reported error or worker not assigned", {
            developerError: backendError,
            errorCode,
            message: result?.message,
            allowedWorkers,
            result,
          })

          if (isWorkerNotAssigned && allowedWorkers?.length > 0) {
            console.debug("TasksTab: Trying with first allowed worker", allowedWorkers[0])
            const allowedWorkerId = allowedWorkers[0].id

            try {
              result = await fetchTasksWithWorkerId(allowedWorkerId)
              console.debug("TasksTab: retry successful with worker", { allowedWorkerId, result })

              if (result.isSuccess === false) {
                setRows([])
                return
              }
            } catch (retryError) {
              console.error("TasksTab: retry fetch failed", retryError)
              setRows([])
              return
            }
          } else {
            setRows([])
            return
          }
        }

        let jobName = "-"
        let clientName = "-"
        let workCenter = "-"
        let workerName = "-"
        let tasks: any[] = []

        if (result.data) {
          if (Array.isArray(result.data.tasks)) {
            tasks = result.data.tasks
            jobName = result.data.jobName || "-"
            clientName = result.data.clientName || "-"
            workCenter = result.data.workCenter || "-"
            workerName = result.data.workerName || "-"
          } else {
            console.debug("TasksTab: tasks array not found directly", { resultData: result.data })
            tasks = []
          }
        } else {
          console.debug("TasksTab: no data field in result")
          tasks = []
        }

        console.debug("TasksTab: processing success response", {
          result,
          extractedData: {
            hasTasks: Array.isArray(tasks),
            tasksLength: Array.isArray(tasks) ? tasks.length : 0,
            jobName,
            clientName,
            workCenter,
            workerName,
          },
        })

        const mappedRows = (tasks || []).map((task: any) => {
          console.debug("TasksTab: Mapping task", { task, jobName, clientName, workCenter, workerName })
          return {
            id: task.id,
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
          }
        })

        console.debug("TasksTab: Final mapped rows", { rows: mappedRows, count: mappedRows.length })

        setRows(mappedRows)
      } catch (error) {
        console.error("TasksTab: error fetching tasks", error)
        setRows([])
      } finally {
        setIsLoading(false)
      }
    }

    console.debug("TasksTab: Running fetchTasks", { jobId, sessionToken: !!session?.accessToken })
    fetchTasks()
  }, [session, jobId, jobData])

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
