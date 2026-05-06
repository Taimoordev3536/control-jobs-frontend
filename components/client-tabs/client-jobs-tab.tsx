"use client"

import { useState, useEffect } from "react"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"

interface ClientJobsTabProps {
  clientId: string
}

interface ClientJobRow {
  jobId: number
  publicId: string
  jobName: string
  workCenters?: Array<{ id: number; publicId: string; name: string }>
  workCenterNames?: string
  workers?: Array<{ id: number; publicId?: string; name: string | null }>
  // Presentation-only fields consumed by TabTableTemplate columns:
  denomination: string
  workCentersLabel: string
  workersLabel: string
}

export function ClientJobsTab({ clientId }: ClientJobsTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [jobs, setJobs] = useState<ClientJobRow[]>([])
  // When a row is clicked we swap the list out for JobAttendanceDetail (which
  // internally fetches /jobs/:jobId/scan-history). Keeping this state local to
  // the tab avoids a route change and preserves the parent Clients page tabs.
  const [selectedJob, setSelectedJob] = useState<ClientJobRow | null>(null)

  useEffect(() => {
    if (!clientId || !session?.accessToken) return

    const fetchJobs = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/by-client/${clientId}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        )
        if (!response.ok) {
          setJobs([])
          return
        }
        const result = await response.json()
        const data = Array.isArray(result?.data) ? result.data : []
        setJobs(
          data.map((j: any) => {
            const workCenters: Array<{ name?: string }> = Array.isArray(j.workCenters)
              ? j.workCenters
              : []
            const workers: Array<{ name?: string | null }> = Array.isArray(j.workers)
              ? j.workers
              : []
            return {
              jobId: j.jobId,
              publicId: j.publicId,
              jobName: j.jobName,
              workCenters: j.workCenters,
              workCenterNames: j.workCenterNames,
              workers: j.workers,
              denomination: j.jobName,
              // Sort/filter values: newline-joined so the natural string compare
              // still works while the column render below shows one item per line.
              workCentersLabel:
                j.workCenterNames || workCenters.map((w) => w?.name || "").filter(Boolean).join("\n"),
              workersLabel: workers.map((w) => w?.name || "").filter(Boolean).join("\n"),
            }
          }),
        )
      } catch (error) {
        console.error("Error fetching client jobs:", error)
        setJobs([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [clientId, session?.accessToken])

  if (selectedJob) {
    return (
      <JobAttendanceDetail
        jobId={selectedJob.publicId}
        jobData={{
          id: selectedJob.jobId,
          publicId: selectedJob.publicId,
          jobName: selectedJob.jobName,
          workCenters: selectedJob.workCenters,
          workers: selectedJob.workers,
        }}
        onBack={() => setSelectedJob(null)}
      />
    )
  }

  // Renders an array of strings as a stack of <div> rows so each work center
  // / worker name lands on its own line in the cell instead of being joined
  // with commas (which produced ugly soft-wraps on long names).
  const renderLines = (items: Array<string | null | undefined>) => {
    const cleaned = items.filter((v): v is string => !!v && v.trim() !== "")
    if (cleaned.length === 0) return "-"
    return (
      <div className="flex flex-col gap-0.5">
        {cleaned.map((line, i) => (
          <span key={i} className="leading-snug">{line}</span>
        ))}
      </div>
    )
  }

  const columns: TabTableColumn[] = [
    {
      key: "denomination",
      label: t("denomination"),
      sortable: true,
      width: "35%",
    },
    {
      key: "workCentersLabel",
      label: t("workCenters"),
      sortable: true,
      width: "35%",
      render: (_value, row: ClientJobRow) =>
        renderLines((row.workCenters || []).map((w) => w?.name)),
    },
    {
      key: "workersLabel",
      label: t("workers"),
      sortable: true,
      width: "30%",
      render: (_value, row: ClientJobRow) =>
        renderLines((row.workers || []).map((w) => w?.name || null)),
    },
  ]

  return (
    <TabTableTemplate
      columns={columns}
      data={jobs}
      loading={isLoading}
      emptyMessage={t("noDataAvailableInTable")}
      onRowClick={(row) => setSelectedJob(row as ClientJobRow)}
    />
  )
}
