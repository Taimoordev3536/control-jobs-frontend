"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
  const { t } = useTranslation()
  const { session, getUserRole } = useAuth()
  const isClient = getUserRole() === "client"
  const router = useRouter()
  const [cursor, setCursor] = useState(() => { const d = madridToday(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setIsLoading(true)
    apiFetch<any>(`/jobs/${isClient ? "client" : "worker"}/work-session-records?startDate=${ymd(monthStart)}&endDate=${ymd(monthEnd)}`)
      .then((j) => setData(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [session?.accessToken, cursor])

  useEffect(() => { load() }, [load])

  const rows = useMemo(
    () =>
      data.map((r) => ({
        id: r.id,
        recordId: r.id,
        fecha: r.fecha,
        job: r.job || "—",
        worker: r.worker || "—",
        entrada: r.entrada || "—",
        salida: r.salida || "—",
        total: r.total || "—",
        alerts: r.alerts && r.alerts !== "None" ? r.alerts : "—",
        punctuality: r.punctuality || null,
        lateMinutes: r.lateMinutes ?? null,
      })),
    [data],
  )

  const renderPunctuality = (_v: any, row: any) => {
    const p = row.punctuality
    if (!p) return <span className="text-muted-foreground">{row.alerts && row.alerts !== "—" ? row.alerts : "—"}</span>
    const map: Record<string, { label: string; cls: string }> = {
      early: { label: t("early") || "Anticipado", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
      onTime: { label: t("onTime") || "A tiempo", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
      late: { label: `${t("late") || "Tarde"}${row.lateMinutes ? ` +${row.lateMinutes}m` : ""}`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    }
    const m = map[p]
    if (!m) return <span className="text-muted-foreground">—</span>
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.cls}`}>{m.label}</span>
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

  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" })

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
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noRecords") || "No records for this month"}
        onRowClick={(row: any) => router.push(`/records/${isClient ? "client" : "worker"}/${row.recordId}`)}
        getRowId={(r: any) => r.id}
      />
    </div>
  )
}
