"use client"

import { useCallback, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`px-4 py-3 ${multiline ? "" : "flex items-start justify-between gap-4"}`}>
      <span className="text-xs font-medium text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-medium text-foreground ${multiline ? "block mt-1 whitespace-pre-wrap" : "text-right"}`}>{value}</span>
    </div>
  )
}

export default function EmployerClientRequestsPage() {
  const { t } = useTranslation()
  const { session, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<any | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const typeLabel = (v: string) =>
    v === "new_job" ? (t("newJob") || "Nuevo Job") : v === "change" ? (t("changeRequest") || "Cambio") : (t("absence") || "Ausencia")
  const statusMeta = (v: string) =>
    ({
      pending: { label: t("pending") || "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
      accepted: { label: t("accepted") || "Aceptada", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      rejected: { label: t("rejected") || "Rechazada", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
    } as Record<string, { label: string; color: string }>)[v] || { label: v, color: "bg-muted text-muted-foreground" }

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["client-requests", "list"],
    queryFn: async () => {
      const j = await apiFetch<{ data: any[] }>("/client-requests")
      return Array.isArray(j?.data) ? j.data : Array.isArray(j as any) ? (j as any) : []
    },
    enabled: isAuthenticated,
  })

  const load = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["client-requests"] }),
    [queryClient],
  )

  const rows = useMemo(
    () =>
      data.map((r) => ({
        id: r.id,
        client: r.clientName || "—",
        type: typeLabel(r.type),
        subject: r.subject || "—",
        dates: r.startDate
          ? `${formatLocalDate(r.startDate)}${r.endDate ? ` – ${formatLocalDate(r.endDate)}` : ""}`
          : formatLocalDate(r.createdAt),
        status: r.status,
        raw: r,
      })),
    [data, t],
  )

  const columns = [
    { key: "client", label: t("client") || "Cliente", sortable: true, align: "left" as const },
    { key: "type", label: t("type") || "Tipo", sortable: true, align: "left" as const, width: "140px" },
    { key: "subject", label: t("subject") || "Asunto", align: "left" as const },
    { key: "dates", label: t("dates") || "Fechas", align: "center" as const, width: "200px" },
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
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "solicitudes-clientes.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "solicitudes-clientes.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
  ]

  const review = async (status: "accepted" | "rejected") => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client-requests/${selected.id}/review`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewerNotes: notes }),
      })
      if (!res.ok) throw new Error("review failed")
      toast({ title: status === "accepted" ? t("requestAccepted") || "Solicitud aceptada" : t("requestRejected") || "Solicitud rechazada", variant: "success" as any })
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
        title={t("clientRequests") || "Solicitudes de clientes"}
        data={rows}
        columns={columns}
        actionButtons={actionButtons}
        isLoading={isLoading}
        emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noRequestsYet") || "No requests yet"}
        onRowClick={(row: any) => { setSelected(row.raw); setNotes(row.raw?.reviewerNotes || "") }}
        getRowId={(r: any) => r.id}
      />

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNotes("") } }}>
        <DialogContent className="w-full max-w-[94vw] sm:max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col bg-background overflow-hidden">
          <DialogHeader className="p-6 pb-4 space-y-2 border-b border-border">
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
              {t("clientRequests") || "Solicitud de cliente"}
            </DialogTitle>
            {selected && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">{selected.clientName || "—"}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusMeta(selected.status).color}`}>{statusMeta(selected.status).label}</span>
              </div>
            )}
          </DialogHeader>

          {selected && (
            <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                <Field label={t("type") || "Tipo"} value={typeLabel(selected.type)} />
                {selected.jobName && <Field label={t("job") || "Job"} value={selected.jobName} />}
                <Field label={t("subject") || "Asunto"} value={selected.subject || "—"} />
                {(selected.startDate || selected.endDate) && (
                  <Field label={t("dates") || "Fechas"} value={`${selected.startDate ? formatLocalDate(selected.startDate) : "—"}${selected.endDate ? ` – ${formatLocalDate(selected.endDate)}` : ""}`} />
                )}
                {selected.description && <Field label={t("description") || "Descripción"} value={selected.description} multiline />}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("reviewerNotes") || "Notas del revisor"}</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t("reviewNotesPlaceholder") || t("optional") || "Opcional"} className="text-sm" />
              </div>
            </div>
          )}

          <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => review("rejected")} disabled={saving} className="text-red-600 border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/50">
              <X className="h-4 w-4 mr-1.5" />{t("reject") || "Rechazar"}
            </Button>
            <Button onClick={() => review("accepted")} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="h-4 w-4 mr-1.5" />{t("accept") || "Aceptar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
