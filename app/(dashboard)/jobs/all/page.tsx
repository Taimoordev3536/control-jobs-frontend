"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import AddJobModal from "@/components/add-job-modal/main"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { apiFetch } from "@/lib/api"
import { CountBadgePopover } from "@/components/ui/count-badge-popover"

export default function AllJobsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showAddJobModal, setShowAddJobModal] = useState(false)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs", "employer-all"],
    queryFn: async () => {
      const j = await apiFetch<{ data: any[] }>("/jobs/employer/all-jobs")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: isAuthenticated,
  })

  const estado = (s: string) => {
    if (s === "cancelled") return { label: t("statusCancelled") || "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" }
    if (s === "on_hold") return { label: t("statusPaused") || "Pausado", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" }
    return { label: t("statusActive") || "Activo", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" }
  }

  const rows = useMemo(
    () =>
      [...jobs]
        .map((j) => {
          const wcNames = (j.workCenters || []).map((w: any) => w.name).filter(Boolean)
          const cityNames = [...new Set((j.workCenters || []).map((w: any) => w.locality).filter(Boolean))] as string[]
          // De-dupe by the worker's unique id, NOT by display text: several
          // distinct workers can share the same code (e.g. "10120"), and keying
          // on the label would collapse different people into one row.
          const seenWorker = new Set<any>()
          const workerNames = (j.workers || [])
            .filter((w: any) => {
              const k = w.publicId ?? w.id
              if (seenWorker.has(k)) return false
              seenWorker.add(k)
              return true
            })
            .map((w: any) => w.name || w.code)
            .filter(Boolean) as string[]
          return {
            publicId: j.publicId,
            titular: j.clientName || "—",
            // Joined strings drive sort + export (full data); the *List arrays
            // drive the compact "first +N" cell.
            workCenter: wcNames.join(", ") || "—",
            workCenterList: wcNames,
            locality: cityNames.join(", ") || "—",
            localityList: cityNames,
            job: j.jobName || "—",
            worker: workerNames.join(", ") || "—",
            workerList: workerNames,
            status: j.jobStatus,
          }
        })
        .sort((a, b) => a.titular.localeCompare(b.titular)),
    [jobs, t],
  )

  // A job can span many centres / cities / workers. Show the first + a "+N"
  // badge instead of a long comma list; the badge opens a popover (hover on
  // desktop, tap on mobile) listing every value, and exports still carry the
  // full set (they read the joined string, not this cell).
  const compact = (list: string[], fallback: string, label: string) => {
    if (!list || list.length === 0) return <span>{fallback}</span>
    if (list.length === 1) return <span>{list[0]}</span>
    return (
      // flex + min-w-0 lets the first name truncate so the count badge always
      // stays inside the column instead of spilling into the next one.
      <span className="flex items-center gap-1.5 max-w-full">
        <span className="truncate min-w-0">{list[0]}</span>
        <CountBadgePopover items={list} label={label} />
        {/* Hidden but in the DOM so the table's text search still matches the
            centres/cities/workers folded behind the count. */}
        <span className="sr-only">{list.slice(1).join(", ")}</span>
      </span>
    )
  }

  const columns = [
    { key: "titular", label: t("titular") || "Titular", sortable: true, align: "left" as const },
    { key: "workCenter", label: t("workCenter") || "Centro de Trabajo", sortable: true, align: "left" as const, render: (_v: string, row: any) => compact(row.workCenterList, "—", t("workCenter") || "Centro de Trabajo") },
    { key: "locality", label: t("locality") || "Localidad", sortable: true, align: "left" as const, width: "140px", render: (_v: string, row: any) => compact(row.localityList, "—", t("locality") || "Localidad") },
    { key: "job", label: t("job") || "Job", sortable: true, align: "left" as const },
    { key: "worker", label: t("worker") || "Trabajador", align: "left" as const, render: (_v: string, row: any) => compact(row.workerList, "—", t("worker") || "Trabajador") },
    {
      key: "status",
      label: t("status") || "Estado",
      sortable: true,
      align: "center" as const,
      width: "120px",
      render: (v: string) => {
        const e = estado(v)
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.color}`}>{e.label}</span>
      },
    },
  ]

  const actionButtons = [
    { icon: Plus, onClick: () => setShowAddJobModal(true), title: t("add") || "Add", type: "add" as any },
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "jobs.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "jobs.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
    { icon: PdfIcon, onClick: () => exportToPDF(rows, columns, "jobs.pdf"), title: t("exportPdf") || "Export PDF", type: "pdf" as any },
  ]

  return (
    <>
      <DataListTemplate
        title={t("management") || "Gestión"}
        data={rows}
        columns={columns}
        actionButtons={actionButtons}
        isLoading={isLoading}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noJobsAvailable") || "No jobs yet"}
        onRowClick={(row: any) => router.push(`/jobs/${row.publicId}/detail`)}
        getRowId={(r: any) => r.publicId}
      />
      <AddJobModal open={showAddJobModal} onOpenChange={setShowAddJobModal} onJobAdded={() => queryClient.invalidateQueries({ queryKey: ["jobs", "employer-all"] })} />
    </>
  )
}
