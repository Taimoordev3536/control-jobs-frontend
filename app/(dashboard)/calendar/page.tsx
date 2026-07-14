"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/ui/date-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { formatLocalDate, madridToday, madridTodayKey } from "@/lib/datetime"
import ClientCalendar from "@/components/dashboards/client-dashboard/client-calendar"
import { CalendarYearGrid } from "@/components/ui/calendar-year-grid"
import ConsultIcon from "@/icons/new/consultas.svg"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const statusMeta: Record<string, { key: string; fallback: string; badge: string; accent: string; dot: string }> = {
  pending: { key: "pending", fallback: "Pendiente", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", accent: "border-l-amber-400", dot: "bg-amber-400" },
  approved: { key: "approved", fallback: "Aprobada", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", accent: "border-l-emerald-400", dot: "bg-emerald-500" },
  rejected: { key: "rejected", fallback: "Rechazada", badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300", accent: "border-l-red-400", dot: "bg-red-500" },
}

export default function CalendarPage() {
  const { getUserRole } = useAuth()
  return getUserRole() === "client" ? <ClientCalendar /> : <WorkerCalendarView />
}

function WorkerCalendarView() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const todayStr = madridTodayKey()

  const [tab, setTab] = useState<"laboral" | "solicitudes">("laboral")

  // --- Laboral (month calendar) ---
  const [cursor, setCursor] = useState(() => madridToday())
  const [days, setDays] = useState<Record<string, any>>({})
  const [loadingCal, setLoadingCal] = useState(true)
  const [view, setView] = useState<"month" | "year">("month")

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const rangeStart = view === "year" ? new Date(cursor.getFullYear(), 0, 1) : monthStart
  const rangeEnd = view === "year" ? new Date(cursor.getFullYear(), 11, 31) : monthEnd

  const loadCal = useCallback(() => {
    if (!session?.accessToken) return
    setLoadingCal(true)
    fetch(`${base}/jobs/worker/my-calendar?start=${ymd(rangeStart)}&end=${ymd(rangeEnd)}`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => {
        const map: Record<string, any> = {}
        ;(j?.data || []).forEach((d: any) => (map[d.date] = d))
        setDays(map)
      })
      .catch(() => setDays({}))
      .finally(() => setLoadingCal(false))
  }, [session?.accessToken, base, cursor, view])

  useEffect(() => { loadCal() }, [loadCal])

  const step = (dir: number) => setCursor((c) => view === "year" ? new Date(c.getFullYear() + dir, c.getMonth(), 1) : new Date(c.getFullYear(), c.getMonth() + dir, 1))
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) cells.push(new Date(d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]

  // --- Solicitudes (absence requests) ---
  const [type, setType] = useState("vacation")
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [reason, setReason] = useState("")
  const [list, setList] = useState<any[]>([])
  const [loadingReq, setLoadingReq] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState("")

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v

  const loadReq = useCallback(() => {
    if (!session?.accessToken) return
    setLoadingReq(true)
    fetch(`${base}/absences/mine`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => setList(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []))
      .catch(() => setList([]))
      .finally(() => setLoadingReq(false))
  }, [session?.accessToken, base])

  useEffect(() => { loadReq() }, [loadReq])

  const counts = {
    pending: list.filter((r) => r.status === "pending").length,
    approved: list.filter((r) => r.status === "approved").length,
    rejected: list.filter((r) => r.status === "rejected").length,
  }
  const filtered = filter ? list.filter((r) => r.status === filter) : list

  const submit = async () => {
    if (!session?.accessToken) return
    if (endDate < startDate) {
      toast({ title: t("invalidDateRange") || "End date must be after start", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/absences`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate, endDate, reason }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "failed") }
      toast({ title: t("requestSubmitted") || "Solicitud enviada", variant: "success" })
      setType("vacation"); setStartDate(todayStr); setEndDate(todayStr); setReason("")
      loadReq(); loadCal()
    } catch (e: any) {
      toast({ title: e.message || t("error") || "Error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const FilterTile = ({ label, value, dot, status }: { label: string; value: number; dot: string; status: string }) => {
    const active = filter === status
    return (
      <button
        type="button"
        onClick={() => setFilter(active ? "" : status)}
        className={`text-left bg-card border rounded-xl shadow-sm px-4 py-3 transition-all hover:shadow-md ${active ? "border-[#662D91] ring-1 ring-[#662D91]" : "border-border"}`}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</span>
        </div>
        <div className={`text-[11px] uppercase tracking-wide font-semibold mt-1.5 ${active ? "text-[#662D91]" : "text-muted-foreground"}`}>{label}</div>
      </button>
    )
  }

  return (
    <div className="w-full px-4 md:px-6 pt-2 pb-4 md:pb-6 bg-background min-h-screen space-y-4">
      <div className="space-y-1">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("back") || "Atrás"}
        </button>
        <h1 className="text-2xl font-semibold text-foreground">{t("calendar") || "Calendario"}</h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[{ k: "laboral", l: t("laboral") || "Laboral" }, { k: "solicitudes", l: t("requests") || "Solicitudes" }].map((x) => (
          <button key={x.k} onClick={() => setTab(x.k as any)} className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === x.k ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}>{x.l}</button>
        ))}
      </div>

      {tab === "laboral" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button onClick={() => setView("month")} className={`px-3 h-9 text-sm ${view === "month" ? "bg-[#662D91] text-white" : "bg-background text-foreground"}`}>{t("month") || "Mes"}</button>
              <button onClick={() => setView("year")} className={`px-3 h-9 text-sm ${view === "year" ? "bg-[#662D91] text-white" : "bg-background text-foreground"}`}>{t("year") || "Año"}</button>
            </div>
            <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCursor(madridToday())}>{t("today") || "Hoy"}</Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="text-sm font-medium capitalize ml-1">{view === "year" ? cursor.getFullYear() : monthLabel}</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t("laborable") || "Laborable"}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />{t("holiday") || "Festivo"}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{t("absence") || "Ausencia"}</span>
          </div>
          {loadingCal ? (
            <div className="flex justify-center py-12"><AnimatedLoader /></div>
          ) : view === "year" ? (
            <CalendarYearGrid
              year={cursor.getFullYear()}
              dayStatus={(key) => { const d = days[key]; return d?.holiday ? "holiday" : d?.absence ? "absence" : d?.working ? "working" : null }}
              onPickMonth={(m) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setView("month") }}
            />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((w) => <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="min-h-[76px] rounded-md bg-muted/10" />
                const key = ymd(d)
                const day = days[key]
                const cls = day?.holiday ? "border-rose-300 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/20"
                  : day?.absence ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
                  : day?.working ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                  : "border-border"
                return (
                  <div key={i} className={`min-h-[76px] rounded-md border p-1 ${cls}`}>
                    <div className={`text-xs font-medium ${key === todayStr ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                    {day?.holiday && <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate">{day.holidayName || t("holiday") || "Festivo"}</div>}
                    {!day?.holiday && day?.absence && <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{typeLabel(day.absence.type)}</div>}
                    {!day?.holiday && !day?.absence && (day?.jobs || []).slice(0, 2).map((j: any, k: number) => (
                      <div key={k} className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">{j.jobName}</div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === "solicitudes" && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
            <FilterTile label={t("pending") || "Pendientes"} value={counts.pending} dot={statusMeta.pending.dot} status="pending" />
            <FilterTile label={t("approved") || "Aprobadas"} value={counts.approved} dot={statusMeta.approved.dot} status="approved" />
            <FilterTile label={t("rejected") || "Rechazadas"} value={counts.rejected} dot={statusMeta.rejected.dot} status="rejected" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5 items-start">
            <Card className="lg:col-span-2 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 bg-[#662D91] px-4 py-3 text-white">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("newRequest") || "Nueva solicitud"}</span>
              </div>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("type") || "Tipo"}</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">{t("absVacation") || "Vacaciones"}</SelectItem>
                      <SelectItem value="permit">{t("absPermit") || "Permiso"}</SelectItem>
                      <SelectItem value="sick">{t("absSick") || "Baja"}</SelectItem>
                      <SelectItem value="other">{t("absOther") || "Otro"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("from") || "Desde"}</label>
                    <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} allowPastDates className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("to") || "Hasta"}</label>
                    <DateInput value={endDate} onChange={(e) => setEndDate(e.target.value)} allowPastDates className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("reason") || "Motivo"} <span className="font-normal">({t("optional") || "Opcional"})</span></label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px] text-sm" />
                </div>
                <div className="flex justify-end pt-1">
                  <Button onClick={submit} disabled={submitting} className="bg-[#662D91] hover:bg-[#532073] text-white h-9 text-sm">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    {t("sendRequest") || "Enviar solicitud"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 rounded-xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#662D91]/10 text-[#662D91]"><ConsultIcon className="h-4 w-4" /></span>
                  {t("myRequests") || "Mis solicitudes"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingReq ? (
                  <div className="flex justify-center py-12"><AnimatedLoader /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground/50"><ConsultIcon className="h-7 w-7" /></span>
                    <p className="text-sm text-muted-foreground">{filter ? (t("noResults") || "Sin resultados") : (t("noRequestsYet") || "No has enviado solicitudes.")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {filtered.map((r) => {
                      const s = statusMeta[r.status] || statusMeta.pending
                      return (
                        <div key={r.id} className={`rounded-lg border border-border border-l-4 ${s.accent} bg-card p-3 shadow-sm transition-shadow hover:shadow-md`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground">{typeLabel(r.type)}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{formatLocalDate(r.startDate)} → {formatLocalDate(r.endDate)}</div>
                              {r.reason && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.reason}</div>}
                              {r.reviewerNotes && <div className="text-xs text-muted-foreground mt-1"><b className="text-foreground">{t("response") || "Respuesta"}:</b> {r.reviewerNotes}</div>}
                            </div>
                            <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>{t(s.key) || s.fallback}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
