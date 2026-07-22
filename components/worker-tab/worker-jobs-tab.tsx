"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { Eye, ClipboardList } from "lucide-react"
import { apiFetch } from "@/lib/api"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { CountBadgePopover } from "@/components/ui/count-badge-popover"
import { useTranslation } from "@/hooks/use-translation"

interface WorkerJobsTabProps {
  workerId: string
}

interface WorkerJobRow {
  id: number
  publicId: string
  holder: string
  denomination: string
  workCenter: string
  workCenters?: string[]
}

export function WorkerJobsTab({ workerId }: WorkerJobsTabProps) {
  const { t } = useTranslation()
  const { status } = useSession()
  const router = useRouter()

  // Two per-row actions, matching the client Jobs tab / employer job-card:
  //   Detail  → /jobs/:id/detail          (canonical job info page)
  //   Records → /records/employer?jobId=:id  (attendance records table)
  const openDetail = (row: WorkerJobRow) => router.push(`/jobs/${row.publicId}/detail`)
  const openRecords = (row: WorkerJobRow) => router.push(`/records/employer?jobId=${row.publicId}`)

  // First work centre + a tappable "+N" popover listing the rest.
  const compact = (items: Array<string | null | undefined>, label: string) => {
    const list = items.filter((v): v is string => !!v && v.trim() !== "")
    if (list.length === 0) return <span>-</span>
    if (list.length === 1) return <span>{list[0]}</span>
    return (
      <span className="flex items-center gap-1.5 max-w-full">
        <span className="truncate min-w-0">{list[0]}</span>
        <CountBadgePopover items={list} label={label} />
        <span className="sr-only">{list.slice(1).join(", ")}</span>
      </span>
    )
  }

  const { data = [], isLoading: loading } = useQuery<WorkerJobRow[]>({
    queryKey: ["worker", workerId, "jobs"],
    queryFn: async () => {
      const j = await apiFetch<any>(`/worker/${workerId}/jobs`)
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: status === "authenticated" && !!workerId,
  })

  const columns: TabTableColumn[] = [
    // Pixel widths (not %): with the table's fixed layout the table width becomes
    // the sum of these, so on a phone it grows past the viewport and the wrapper
    // scrolls horizontally (headers/data stay readable) while still filling a
    // desktop — instead of cramming 4 columns into 100% width.
    { key: "holder", label: t("holder"), sortable: true, width: "160px" },
    { key: "denomination", label: t("denomination"), sortable: true, width: "190px" },
    {
      key: "workCenter",
      label: t("workCenter"),
      sortable: true,
      width: "200px",
      render: (_value, row: WorkerJobRow) =>
        compact(row.workCenters ?? (row.workCenter ? row.workCenter.split(",").map((s) => s.trim()) : []), t("workCenters") || "Centros de trabajo"),
    },
    {
      key: "actions",
      label: t("actions") || "Acciones",
      align: "center",
      width: "210px",
      render: (_value, row: WorkerJobRow) => (
        // stopPropagation so the buttons don't also fire any row handler.
        <div className="flex flex-nowrap items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDetail(row)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium whitespace-nowrap bg-neutral-500 hover:bg-neutral-600 text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            {t("details") || "Detalles"}
          </button>
          <button
            onClick={() => openRecords(row)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium whitespace-nowrap bg-purple-700 hover:bg-purple-800 text-white transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            {t("records") || "Registros"}
          </button>
        </div>
      ),
    },
  ]

  return <TabTableTemplate columns={columns} data={data} loading={loading} emptyMessage={t("noJobsAvailable")} />
}
