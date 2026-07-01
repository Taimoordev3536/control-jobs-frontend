"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/ui/date-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface CalDay { date: string; holiday: boolean; holidayName: string | null; absence: { type: string } | null; working: boolean }

export default function WorkerCalendarPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const authHeader = { Authorization: `Bearer ${session?.accessToken}` }

  const [tab, setTab] = useState<"laboral" | "solicitudes">("laboral")

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v
  const statusMeta = (v: string) =>
    ({
      pending: { label: t("pending") || "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
      approved: { label: t("approved") || "Aprobada", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      rejected: { label: t("rejected") || "Rechazada", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
    } as Record<string, { label: string; color: string }>)[v] || { label: v, color: "bg-muted text-muted-foreground" }

  // --- Laboral (month grid) ---
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [days, setDays] = useState<Record<string, CalDay>>({})
  const [loadingCal, setLoadingCal] = useState(true)

  const loadCal = useCallback(() => {
    if (!session?.accessToken) return
    const mStart = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
    const mEnd = ymd(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
    setLoadingCal(true)
    fetch(`${base}/jobs/worker/my-calendar?start=${mStart}&end=${mEnd}`, { headers: authHeader })
      .then((r) => r.json())
      .then((j) => {
        const map: Record<string, CalDay> = {}
        ;(j?.data || []).forEach((d: CalDay) => (map[d.date] = d))
        setDays(map)
      })
      .catch(() => setDays({}))
      .finally(() => setLoadingCal(false))
  }, [session?.accessToken, cursor])
  useEffect(() => { loadCal() }, [loadCal])

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" })
  const todayStr = ymd(new Date())

  // --- Solicitudes ---
  const [requests, setRequests] = useState<any[]>([])
  const [loadingReq, setLoadingReq] = useState(true)
  const [form, setForm] = useState({ type: "vacation", startDate: todayStr, endDate: todayStr, reason: "" })
  const [saving, setSaving] = useState(false)

  const loadReq = useCallback(() => {
    if (!session?.accessToken) return
    setLoadingReq(true)
    fetch(`${base}/absences/mine`, { headers: authHeader })
      .then((r) => r.json())
      .then((j) => setRequests(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []))
      .catch(() => setRequests([]))
      .finally(() => setLoadingReq(false))
  }, [session?.accessToken])
  useEffect(() => { loadReq() }, [loadReq])

  const submit = async () => {
    if (form.endDate < form.startDate) { toast({ title: t("invalidDateRange") || "End date must be after start", variant: "destructive" }); return }
    setSaving(true)
    try {
      const res = await fetch(`${base}/absences`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "failed") }
      toast({ title: t("requestSent") || "Solicitud enviada", variant: "success" as any })
      setForm({ type: "vacation", startDate: todayStr, endDate: todayStr, reason: "" })
      loadReq(); loadCal()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const dayClass = (day?: CalDay) => {
    if (!day) return "border-border"
    if (day.holiday) return "border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/20"
    if (day.absence) return "border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20"
    if (day.working) return "border-green-300 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20"
    return "border-border"
  }

  return (
    <div className="w-full p-4 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("calendar") || "Calendario"}</h1>

      <div className="border-b border-border">
        <nav className="flex gap-2">
          {(["laboral", "solicitudes"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === k ? "border-[#662D91] text-[#662D91]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {k === "laboral" ? t("labor") || "Laboral" : t("requests") || "Solicitudes"}
            </button>
          ))}
        </nav>
      </div>

      {tab === "laboral" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold capitalize">{monthLabel}</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>{t("today") || "Hoy"}</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-200 dark:bg-green-900" />{t("workingDay") || "Laborable"}</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-200 dark:bg-rose-900" />{t("holiday") || "Festivo"}</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-200 dark:bg-amber-900" />{t("absence") || "Ausencia"}</span>
          </div>

          {loadingCal ? (
            <div className="flex justify-center py-10"><AnimatedLoader /></div>
          ) : (
            <div className="grid grid-cols-7 gap-1 max-w-3xl">
              {weekdays.map((w) => <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="min-h-[56px] rounded-md bg-muted/10" />
                const key = ymd(d)
                const day = days[key]
                return (
                  <div key={i} title={day?.holidayName || (day?.absence ? typeLabel(day.absence.type) : "")} className={`min-h-[56px] rounded-md border p-1 ${dayClass(day)}`}>
                    <div className={`text-xs font-medium ${key === todayStr ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                    {day?.holiday && <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate">{day.holidayName || t("holiday") || "Festivo"}</div>}
                    {!day?.holiday && day?.absence && <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{typeLabel(day.absence.type)}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === "solicitudes" && (
        <div className="space-y-4 max-w-2xl">
          <section className="rounded-md border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">{t("newRequest") || "Nueva solicitud"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("type") || "Tipo"}</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">{t("absVacation") || "Vacaciones"}</SelectItem>
                    <SelectItem value="permit">{t("absPermit") || "Permiso"}</SelectItem>
                    <SelectItem value="sick">{t("absSick") || "Baja"}</SelectItem>
                    <SelectItem value="other">{t("absOther") || "Otro"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("from") || "Desde"}</label>
                <DateInput value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} allowPastDates className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("to") || "Hasta"}</label>
                <DateInput value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} allowPastDates className="h-9" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("reason") || "Motivo"} ({t("optional") || "Opcional"})</label>
              <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submit} disabled={saving} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {t("send") || "Enviar"}
              </Button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">{t("myRequests") || "Mis solicitudes"}</h3>
            {loadingReq ? (
              <div className="flex justify-center py-8"><AnimatedLoader /></div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("noRequestsYet") || "No requests yet"}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">{typeLabel(r.type)}</div>
                      <div className="text-xs text-muted-foreground">{formatLocalDate(r.startDate)} – {formatLocalDate(r.endDate)}{r.reason ? ` · ${r.reason}` : ""}</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${statusMeta(r.status).color}`}>{statusMeta(r.status).label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
