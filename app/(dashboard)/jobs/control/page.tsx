"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TabTableTemplate, { TabTableColumn } from "@/components/ui/tab-table-template"

interface ControlWorker {
  id: number
  name: string | null
  code: string
  checkedIn: boolean
  checkInTime: string | null
  checkOutTime: string | null
  durationMinutes: number | null
}
interface ControlRow {
  jobId: number
  publicId: string
  jobName: string
  startTime: string | null
  endTime: string | null
  titular: string | null
  workCenterName: string
  workCenterLocality: string
  workers: ControlWorker[]
  workerNames: string
  firstCheckIn: string | null
  alerts: string[]
  overdue: boolean
  isHoliday?: boolean
  holidayName?: string | null
  scheduleType: string
}

const BUSINESS_TZ = "Europe/Madrid"
function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(new Date())
}
const madridNowHHMM = () =>
  new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: BUSINESS_TZ })
const madridNowMinutes = () => {
  const [h, m] = madridNowHHMM().split(":").map(Number)
  return h * 60 + m
}
function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "—")
const isoHHMM = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: BUSINESS_TZ })
    : null
const rowHour = (r: ControlRow) => (r.startTime ? hhmm(r.startTime) : isoHHMM(r.firstCheckIn) || "—")
const fmtDuration = (min: number | null) => {
  if (min == null) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`
}

export default function JobsControlPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [rows, setRows] = useState<ControlRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<ControlRow | null>(null)

  const alertLabel = (a: string) =>
    ({
      sign_in: t("alertSignIn") || "Entrada",
      sign_out: t("alertSignOut") || "Salida",
      delay: t("alertDelay") || "Retraso",
      duration: t("alertDuration") || "Duración",
    } as Record<string, string>)[a] || a

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/control?date=${date}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      const body = await res.json()
      setRows(res.ok ? body.data || [] : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [date, session?.accessToken])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((r) =>
      [r.titular, r.jobName, r.workerNames, r.workCenterName].some((v) => (v || "").toLowerCase().includes(q)),
    )
  }, [rows, query])

  const isToday = date === todayStr()
  const nowLineIndex = useMemo(() => {
    if (!isToday) return -1
    const nowMin = madridNowMinutes()
    const idx = shown.findIndex((r) => {
      if (!r.startTime) return false
      const [h, m] = r.startTime.split(":").map(Number)
      return h * 60 + m > nowMin
    })
    return idx === -1 ? shown.length : idx
  }, [shown, isToday])

  const columns: TabTableColumn[] = [
    {
      key: "startTime",
      label: t("hour") || "Hora",
      align: "center",
      render: (_v, row) => (
        <span className={row.overdue ? "text-red-700 dark:text-red-400 font-medium" : ""}>{rowHour(row)}</span>
      ),
    },
    { key: "titular", label: t("titular") || "Titular", render: (v) => v || "—" },
    {
      key: "workCenterName",
      label: t("workCenter") || "Centro de Trabajo",
      render: (v, row) => (
        <span>
          {v || "—"}
          {row.workCenterLocality && <span className="text-muted-foreground"> · {row.workCenterLocality}</span>}
        </span>
      ),
    },
    { key: "jobName", label: t("job") || "Job", render: (v) => v || "—" },
    { key: "workerNames", label: t("worker") || "Trabajador", render: (v) => v || "—" },
    {
      key: "alerts",
      label: t("alerts") || "Alertas",
      align: "center",
      width: "9.5rem",
      render: (v, row) => (
        <div className="flex flex-col items-center gap-1">
          {row.overdue && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 text-[11px] font-medium">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {t("noCheckIn") || "Sin fichaje"}
            </span>
          )}
          {(v || []).map((a: string, k: number) => (
            <span key={k} className="whitespace-nowrap rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-medium">
              {alertLabel(a)}
            </span>
          ))}
          {!row.overdue && (!v || v.length === 0) && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
  ]

  const rowClassName = (row: ControlRow, i: number) =>
    row.overdue
      ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50"
      : `${i % 2 === 0 ? "bg-background" : "bg-muted/20"} hover:bg-muted/50 active:bg-muted/70`

  const renderRowBefore = (_row: ControlRow | null, index: number) =>
    index === nowLineIndex ? (
      <tr>
        <td colSpan={columns.length} className="p-0">
          <div className="bg-[#662D91]/10 border-y-2 border-[#662D91] px-3 py-1.5">
            <span className="text-[11px] font-semibold text-[#662D91]">
              {t("now") || "Ahora"} · {madridNowHHMM()}
            </span>
          </div>
        </td>
      </tr>
    ) : null

  const statusBadge = (ok: boolean) =>
    `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      ok
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
    }`

  return (
    <div className="p-2 bg-background min-h-screen space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">{t("control") || "Control"}</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search") || "Search..."}
            className="w-[8.5rem] h-9 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:border-[#662D91] focus:ring-1 focus:ring-[#662D91] bg-background"
          />
          <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDay(d, -1))} className="p-1 h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-[11rem]">
            <DateInput value={date} onChange={(e) => setDate(e.target.value)} allowPastDates className="h-9 text-sm" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDay(d, 1))} className="p-1 h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setDate(todayStr())} className="h-9 text-xs">
              {t("today") || "Today"}
            </Button>
          )}
        </div>
      </div>

      {rows.some((r) => r.isHoliday) && (
        <div className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {t("holiday") || "Festivo"}{rows.find((r) => r.holidayName)?.holidayName ? `: ${rows.find((r) => r.holidayName)?.holidayName}` : ""}
        </div>
      )}

      <TabTableTemplate
        columns={columns}
        data={shown}
        loading={loading}
        showPagination={false}
        emptyMessage={t("noJobsForDay") || "No jobs scheduled for this day"}
        onRowClick={(row) => setSelected(row)}
        rowClassName={rowClassName as any}
        renderRowBefore={renderRowBefore as any}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 bg-background">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-foreground text-center tracking-tight">
              {selected?.jobName}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="px-6 pb-2 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t("hour") || "Hora"}</div>
                  <div className="font-medium text-foreground">
                    {rowHour(selected)}
                    {selected.endTime ? ` – ${hhmm(selected.endTime)}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("titular") || "Titular"}</div>
                  <div className="font-medium text-foreground">{selected.titular || "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("workCenter") || "Centro de Trabajo"}</div>
                  <div className="font-medium text-foreground">
                    {selected.workCenterName || "—"}
                    {selected.workCenterLocality ? ` · ${selected.workCenterLocality}` : ""}
                  </div>
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
                            {w.durationMinutes != null ? ` · ${fmtDuration(w.durationMinutes)}` : ""}
                          </div>
                        )}
                      </div>
                      <span className={statusBadge(w.checkedIn)}>
                        {w.checkedIn ? t("checkedIn") || "Fichado" : t("noCheckIn") || "Sin fichaje"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.alerts.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">{t("alerts") || "Alertas"}</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.alerts.map((a, k) => (
                      <span key={k} className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
                        {alertLabel(a)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 p-6 pt-4">
            <Button onClick={() => setSelected(null)} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              {t("close") || "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
