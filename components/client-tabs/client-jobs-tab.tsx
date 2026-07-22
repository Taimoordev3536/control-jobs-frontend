"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Eye, ClipboardList } from "lucide-react"
import { CountBadgePopover } from "@/components/ui/count-badge-popover"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface ClientJobsTabProps {
  clientId: string
}

interface ClientJobRow {
  jobId: number
  publicId: string
  jobName: string
  workCenters?: Array<{ id: number; publicId: string; name: string }>
  workCenterNames?: string
  workers?: Array<{ id: number; publicId?: string; code?: string | null; name: string | null }>
  // Presentation-only fields consumed by TabTableTemplate columns:
  denomination: string
  workCentersLabel: string
  workersLabel: string
}

export function ClientJobsTab({ clientId }: ClientJobsTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()

  // Two per-row actions, matching the employer job-card exactly:
  //   Detail  → /jobs/:id/detail   (the canonical job info page)
  //   Records → /records/employer?jobId=:id  (the attendance records table)
  const openDetail = (row: ClientJobRow) => router.push(`/jobs/${row.publicId}/detail`)
  const openRecords = (row: ClientJobRow) => router.push(`/records/employer?jobId=${row.publicId}`)

  const { data: jobs = [], isLoading } = useQuery<ClientJobRow[]>({
    queryKey: ["jobs", "by-client", clientId],
    enabled: !!clientId && !!session?.accessToken,
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/by-client/${clientId}`,
        { headers: { Authorization: `Bearer ${session!.accessToken}` } }
      )
      if (!response.ok) return []
      const result = await response.json()
      const data = Array.isArray(result?.data) ? result.data : []
      return data.map((j: any) => {
        const workCenters: Array<{ name?: string }> = Array.isArray(j.workCenters) ? j.workCenters : []
        const workers: Array<{ name?: string | null }> = Array.isArray(j.workers) ? j.workers : []
        return {
          jobId: j.jobId,
          publicId: j.publicId,
          jobName: j.jobName,
          workCenters: j.workCenters,
          workCenterNames: j.workCenterNames,
          workers: j.workers,
          denomination: j.jobName,
          workCentersLabel:
            j.workCenterNames || workCenters.map((w) => w?.name || "").filter(Boolean).join("\n"),
          workersLabel: workers
            .map((w: any) => w?.name || (w?.code ? `Worker ${w.code}` : ""))
            .filter(Boolean)
            .join("\n"),
        }
      })
    },
  })

  // A job can span many centres / workers. Show the first + a clickable "+N"
  // badge that opens a small popover listing every name — same compact style as
  // the Management page. An sr-only span keeps every value in the DOM so the
  // table's text search still matches folded names.
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

  const columns: TabTableColumn[] = [
    {
      key: "denomination",
      label: t("denomination"),
      sortable: true,
      // Pixel widths (not %): with the table's fixed layout the table becomes the
      // sum of these, so on a phone it grows past the viewport and the wrapper
      // scrolls horizontally (headers/data stay readable) while still filling a
      // desktop. Avoids cramming everything into 100% width on mobile.
      width: "190px",
    },
    {
      key: "workCentersLabel",
      label: t("workCenters"),
      sortable: true,
      width: "200px",
      render: (_value, row: ClientJobRow) =>
        compact((row.workCenters || []).map((w) => w?.name), t("workCenters")),
    },
    {
      key: "workersLabel",
      label: t("workers"),
      sortable: true,
      width: "180px",
      render: (_value, row: ClientJobRow) => {
        // De-dupe by the worker's unique id, NOT the label: distinct workers can
        // share a code (e.g. "10120"), and keying on text collapses them into one.
        const seen = new Set<any>()
        const names = (row.workers || [])
          .filter((w) => {
            const k = w?.publicId ?? w?.id
            if (k == null || seen.has(k)) return false
            seen.add(k)
            return true
          })
          .map((w) => w?.name || (w?.code ? `Worker ${w.code}` : null))
        return compact(names, t("workers"))
      },
    },
    {
      key: "actions",
      label: t("actions") || "Acciones",
      align: "center",
      width: "210px",
      render: (_value, row: ClientJobRow) => (
        // stopPropagation so the buttons don't also fire the row's onRowClick.
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

  return (
    <TabTableTemplate
      columns={columns}
      data={jobs}
      loading={isLoading}
      emptyMessage={t("noDataAvailableInTable")}
    />
  )
}
