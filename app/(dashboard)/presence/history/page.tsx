"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { apiFetch } from "@/lib/api"
import { madridToday } from "@/lib/datetime"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function PresenceHistoryPage() {
  const { t, language } = useTranslation()
  const { getUserRole, isAuthenticated } = useAuth()
  const role = getUserRole()
  const isClient = role === "client"
  const scope = isClient ? "client" : "worker"
  const router = useRouter()
  const [cursor, setCursor] = useState(() => { const d = madridToday(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

  // scope + month in the key (same scope-timing bug as the schedule page):
  // gated on role so no wrong-scope call, and the key changes worker->client
  // to refetch once the role resolves.
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["presence-history", scope, ymd(monthStart), ymd(monthEnd)],
    queryFn: async () => {
      const j = await apiFetch<any>(`/jobs/${scope}/work-session-records?startDate=${ymd(monthStart)}&endDate=${ymd(monthEnd)}`)
      return Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    },
    enabled: isAuthenticated && !!role,
  })

  const rows = useMemo(
    () =>
      data.map((r) => {
        // A session with no check-out that's still active is "in progress".
        // The API also ships a pre-localized Spanish label in fecha/salida;
        // ignore it and compose the label client-side so it follows the UI
        // language (and exports stay consistent).
        const inProgress = !r.checkOutTime && !!r.isActive
        const fechaStart = String(r.fecha ?? "").split(" - ")[0]
        return {
          id: r.id,
          recordId: r.id,
          fecha: inProgress ? `${fechaStart} - ${t("inProgress")}` : (r.fecha || "—"),
          job: r.job || "—",
          worker: r.worker || "—",
          entrada: r.entrada || "—",
          salida: r.checkOutTime ? (r.salida || "—") : (inProgress ? t("inProgress") : "—"),
          total: r.total || "—",
          isActive: !!r.isActive,
          checkOutTime: r.checkOutTime ?? null,
          punctuality: r.punctuality || null,
          lateMinutes: r.lateMinutes ?? null,
        }
      }),
    [data, t],
  )

  const renderPunctuality = (_v: any, row: any) => {
    const p = row.punctuality
    const map: Record<string, { label: string; cls: string }> = {
      early: { label: t("early") || "Anticipado", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
      onTime: { label: t("onTime") || "A tiempo", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
      late: { label: `${t("late") || "Tarde"}${row.lateMinutes ? ` +${row.lateMinutes}m` : ""}`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    }
    const m = p ? map[p] : null
    if (m) return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.cls}`}>{m.label}</span>
    // No punctuality code (e.g. no shift scheduled): show a translated
    // active-session indicator instead of the API's raw Spanish alert text.
    if (row.isActive && !row.checkOutTime) {
      return <span className="text-muted-foreground">{t("activeSession") || "Active session"}</span>
    }
    return <span className="text-muted-foreground">—</span>
  }

  const columns = [
    { key: "fecha", label: t("date") || "Fecha", sortable: true, align: "left" as const, width: "200px" },
    { key: "job", label: t("job") || "Job", sortable: true, align: "left" as const },
    ...(isClient ? [{ key: "worker", label: t("worker") || "Trabajador", sortable: true, align: "left" as const }] : []),
    { key: "entrada", label: t("alertSignIn") || "Entrada", align: "center" as const, width: "100px" },
    { key: "salida", label: t("alertSignOut") || "Salida", align: "center" as const, width: "110px" },
    { key: "total", label: t("total") || "Total", align: "center" as const, width: "100px" },
    { key: "punctuality", label: t("punctuality") || "Puntualidad", align: "center" as const, width: "150px", render: renderPunctuality },
  ]

  const actionButtons = [
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "historial.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "historial.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
    { icon: PdfIcon, onClick: () => exportToPDF(rows, columns, "historial.pdf"), title: t("exportPdf") || "Export PDF", type: "pdf" as any },
  ]

  const monthLabel = cursor.toLocaleDateString(language, { month: "long", year: "numeric", timeZone: "Europe/Madrid" })

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 px-2 pt-2">
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => { const d = madridToday(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>{t("today") || "Hoy"}</Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium capitalize ml-1">{monthLabel}</span>
      </div>
      <DataListTemplate
        title={t("history") || "Historial"}
        data={rows}
        columns={columns}
        actionButtons={actionButtons}
        isLoading={isLoading}
        emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noRecords") || "No records for this month"}
        onRowClick={(row: any) => router.push(`/records/${isClient ? "client" : "worker"}/${row.recordId}`)}
        getRowId={(r: any) => r.id}
      />
    </div>
  )
}
