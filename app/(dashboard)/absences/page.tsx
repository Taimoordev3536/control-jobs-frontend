"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Filter, Check, X } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon } from "@/components/ui/data-list-template"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"
import { exportToCSV, exportToXLSX } from "@/lib/export"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"

export default function AbsencesPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v
  const statusMeta = (v: string) =>
    ({
      pending: { label: t("pending") || "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
      approved: { label: t("approved") || "Aprobada", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      rejected: { label: t("rejected") || "Rechazada", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
    } as Record<string, { label: string; color: string }>)[v] || { label: v, color: "bg-muted text-muted-foreground" }

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setIsLoading(true)
    apiFetch<{ data: any[] }>("/absences")
      .then((j) => setData(Array.isArray(j?.data) ? j.data : Array.isArray(j as any) ? (j as any) : []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [session?.accessToken])

  useEffect(() => { load() }, [load])

  const rows = useMemo(
    () =>
      data.map((a) => ({
        id: a.id,
        worker: a.workerName || "—",
        type: typeLabel(a.type),
        dates: `${formatLocalDate(a.startDate)} – ${formatLocalDate(a.endDate)}`,
        reason: a.reason || "—",
        status: a.status,
        raw: a,
      })),
    [data, t],
  )

  const columns = [
    { key: "worker", label: t("worker") || "Trabajador", sortable: true, align: "left" as const },
    { key: "type", label: t("type") || "Tipo", sortable: true, align: "left" as const, width: "130px" },
    { key: "dates", label: t("dates") || "Fechas", align: "center" as const, width: "200px" },
    { key: "reason", label: t("reason") || "Motivo", align: "left" as const },
    {
      key: "status",
      label: t("status") || "Estado",
      sortable: true,
      align: "center" as const,
      width: "120px",
      render: (v: string) => {
        const m = statusMeta(v)
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.color}`}>{m.label}</span>
      },
    },
  ]

  const actionButtons = [
    { icon: Filter, onClick: () => {}, title: t("filter"), type: "filter" as any },
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "ausencias.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "ausencias.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
  ]

  const review = async (status: "approved" | "rejected") => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/absences/${selected.id}/review`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewerNotes: notes }),
      })
      if (!res.ok) throw new Error("review failed")
      toast({ title: status === "approved" ? t("approved") || "Aprobada" : t("rejected") || "Rechazada", variant: "success" as any })
      setSelected(null)
      setNotes("")
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DataListTemplate
        title={t("absencesRequests") || "Solicitudes de ausencias"}
        data={rows}
        columns={columns}
        actionButtons={actionButtons}
        isLoading={isLoading}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noRequestsYet") || "No requests yet"}
        onRowClick={(row: any) => { setSelected(row.raw); setNotes(row.raw?.reviewerNotes || "") }}
        getRowId={(r: any) => r.id}
      />

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNotes("") } }}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{t("absenceRequest") || "Solicitud de ausencia"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">{t("worker") || "Trabajador"}</div><div className="font-medium">{selected.workerName || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">{t("type") || "Tipo"}</div><div className="font-medium">{typeLabel(selected.type)}</div></div>
                <div className="col-span-2"><div className="text-xs text-muted-foreground">{t("dates") || "Fechas"}</div><div className="font-medium">{formatLocalDate(selected.startDate)} – {formatLocalDate(selected.endDate)}</div></div>
                {selected.reason && <div className="col-span-2"><div className="text-xs text-muted-foreground">{t("reason") || "Motivo"}</div><div className="font-medium">{selected.reason}</div></div>}
                <div className="col-span-2"><div className="text-xs text-muted-foreground">{t("status") || "Estado"}</div><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusMeta(selected.status).color}`}>{statusMeta(selected.status).label}</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t("reviewerNotes") || "Notas del revisor"}</div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("optional") || "Opcional"} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => review("rejected")} disabled={saving} className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/50">
              <X className="h-4 w-4 mr-1" />{t("reject") || "Rechazar"}
            </Button>
            <Button onClick={() => review("approved")} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="h-4 w-4 mr-1" />{t("approve") || "Aprobar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
