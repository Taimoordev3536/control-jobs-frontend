"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import { useTranslation } from "@/hooks/use-translation"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TabTableTemplate, { TabTableColumn } from "@/components/ui/tab-table-template"

const BUSINESS_TZ = "Europe/Madrid"
function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(new Date())
}
function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "—")
const isoHHMM = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: BUSINESS_TZ }) : null

interface IncWorker { id: number; name: string | null; code: string; checkedIn: boolean; checkInTime: string | null; checkOutTime: string | null; durationMinutes: number | null }
interface IncRow {
  jobId: number; publicId: string; jobName: string
  startTime: string | null; endTime: string | null
  titular: string | null; workCenterName: string; workCenterLocality: string
  workers: IncWorker[]; workerNames: string; firstCheckIn: string | null
  overdue: boolean; incidents: string[]
}

export default function IncidentsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [selected, setSelected] = useState<IncRow | null>(null)

  const incidentLabel = (i: string) =>
    ({
      no_checkin: t("incNoCheckin") || "Sin fichaje",
      late_checkin: t("incLate") || "Retraso",
      no_checkout: t("incNoCheckout") || "Sin salida",
    } as Record<string, string>)[i] || i

  const incidentStyle = (i: string) =>
    i === "no_checkin"
      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
      : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"

  const rowHour = (r: IncRow) => (r.startTime ? hhmm(r.startTime) : isoHHMM(r.firstCheckIn) || "—")

  const { data: rows = [], isLoading: loading } = useQuery<IncRow[]>({
    queryKey: ["jobs", "incidents", date],
    queryFn: async () => {
      const body = await apiFetch<{ data: IncRow[] }>(`/jobs/incidents?date=${date}`)
      return body?.data || []
    },
    enabled: isAuthenticated,
  })

  const isToday = date === todayStr()

  const columns: TabTableColumn[] = [
    { key: "startTime", label: t("hour") || "Hora", align: "center", render: (_v, row) => <span className={row.overdue ? "text-red-700 dark:text-red-400 font-medium" : ""}>{rowHour(row)}</span> },
    { key: "titular", label: t("titular") || "Titular", render: (v) => v || "—" },
    {
      key: "workCenterName",
      label: t("workCenter") || "Centro de Trabajo",
      render: (v, row) => (
        <span>{v || "—"}{row.workCenterLocality && <span className="text-muted-foreground"> · {row.workCenterLocality}</span>}</span>
      ),
    },
    { key: "jobName", label: t("job") || "Job", render: (v) => v || "—" },
    { key: "workerNames", label: t("worker") || "Trabajador", render: (v) => v || "—" },
    {
      key: "incidents",
      label: t("incidents") || "Incidencias",
      align: "center",
      width: "10rem",
      render: (v) => (
        <div className="flex flex-col items-center gap-1">
          {(v || []).map((i: string, k: number) => (
            <span key={k} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${incidentStyle(i)}`}>
              {i === "no_checkin" && <AlertTriangle className="h-3 w-3 shrink-0" />}
              {incidentLabel(i)}
            </span>
          ))}
        </div>
      ),
    },
  ]

  const rowClassName = (row: IncRow, i: number) =>
    row.overdue
      ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50"
      : `${i % 2 === 0 ? "bg-background" : "bg-muted/20"} hover:bg-muted/50 active:bg-muted/70`

  const statusBadge = (ok: boolean) =>
    `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`

  return (
    <div className="p-2 bg-background min-h-screen space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">{t("incidents") || "Incidencias"}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDay(d, -1))} className="p-1 h-9 w-9"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="w-[11rem]"><DateInput value={date} onChange={(e) => setDate(e.target.value)} allowPastDates className="h-9 text-sm" /></div>
          <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDay(d, 1))} className="p-1 h-9 w-9"><ChevronRight className="h-4 w-4" /></Button>
          {!isToday && <Button variant="outline" size="sm" onClick={() => setDate(todayStr())} className="h-9 text-xs">{t("today") || "Today"}</Button>}
        </div>
      </div>

      <TabTableTemplate
        columns={columns}
        data={rows}
        loading={loading}
        showPagination={false}
        emptyMessage={t("noIncidents") || "No incidents for this day"}
        onRowClick={(row) => setSelected(row)}
        rowClassName={rowClassName as any}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 bg-background">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-foreground text-center tracking-tight">{selected?.jobName}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="px-6 pb-2 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t("hour") || "Hora"}</div>
                  <div className="font-medium text-foreground">{rowHour(selected)}{selected.endTime ? ` – ${hhmm(selected.endTime)}` : ""}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("titular") || "Titular"}</div>
                  <div className="font-medium text-foreground">{selected.titular || "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("workCenter") || "Centro de Trabajo"}</div>
                  <div className="font-medium text-foreground">{selected.workCenterName || "—"}{selected.workCenterLocality ? ` · ${selected.workCenterLocality}` : ""}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1.5">{t("incidents") || "Incidencias"}</div>
                <div className="flex flex-wrap gap-1">
                  {selected.incidents.map((i, k) => (
                    <span key={k} className={`rounded-full px-2 py-0.5 text-xs font-medium ${incidentStyle(i)}`}>{incidentLabel(i)}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1.5">{t("worker") || "Trabajador"}</div>
                <div className="space-y-1.5">
                  {selected.workers.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
                  {selected.workers.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{w.name || w.code}</div>
                        {w.checkedIn && (
                          <div className="text-xs text-muted-foreground">
                            {t("alertSignIn") || "Entrada"} {isoHHMM(w.checkInTime)}
                            {w.checkOutTime ? ` · ${t("alertSignOut") || "Salida"} ${isoHHMM(w.checkOutTime)}` : ""}
                          </div>
                        )}
                      </div>
                      <span className={statusBadge(w.checkedIn)}>{w.checkedIn ? t("checkedIn") || "Fichado" : t("noCheckIn") || "Sin fichaje"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 p-6 pt-4">
            <Button onClick={() => setSelected(null)} className="bg-purple-600 hover:bg-purple-700 text-white px-6">{t("close") || "Close"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
