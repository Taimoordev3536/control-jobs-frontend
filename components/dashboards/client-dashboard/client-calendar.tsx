"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { madridToday, madridTodayKey } from "@/lib/datetime"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const statusCls: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
}

export default function ClientCalendar() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [tab, setTab] = useState<"laboral" | "solicitudes">("laboral")
  const [cursor, setCursor] = useState(() => madridToday())
  const [days, setDays] = useState<Record<string, any>>({})
  const [absences, setAbsences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    const h = { Authorization: `Bearer ${session.accessToken}` }
    setLoading(true)
    Promise.all([
      fetch(`${base}/jobs/client/my-calendar?start=${ymd(monthStart)}&end=${ymd(monthEnd)}`, { headers: h }).then((r) => r.json()),
      fetch(`${base}/client-requests/mine`, { headers: h }).then((r) => r.json()),
    ])
      .then(([cal, reqs]) => {
        const map: Record<string, any> = {}
        ;(cal?.data || []).forEach((d: any) => (map[d.date] = d))
        setDays(map)
        setAbsences(Array.isArray(reqs?.data) ? reqs.data.filter((r: any) => r.type === "absence") : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken, base, cursor])

  useEffect(() => { load() }, [load])

  const absenceDays = useMemo(() => {
    const set = new Set<string>()
    absences.filter((a) => a.status === "accepted" && a.startDate && a.endDate).forEach((a) => {
      let c = new Date(`${a.startDate}T12:00:00`)
      const e = new Date(`${a.endDate}T12:00:00`)
      let g = 0
      while (c <= e && g < 400) { g++; set.add(ymd(c)); c.setDate(c.getDate() + 1) }
    })
    return set
  }, [absences])

  const step = (dir: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const todayStr = madridTodayKey()

  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) cells.push(new Date(d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]

  const submit = async () => {
    if (!session?.accessToken || !from || !to) {
      toast({ title: t("selectDates") || "Selecciona las fechas", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/client-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "absence", subject: reason || (t("absence") || "Ausencia"), description: reason, startDate: from, endDate: to }),
      })
      if (!res.ok) throw new Error()
      toast({ title: t("requestSubmitted") || "Solicitud enviada" })
      setFrom(""); setTo(""); setReason(""); load()
    } catch {
      toast({ title: t("error") || "Error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("calendar") || "Calendario"}</h1>

      <div className="flex gap-1 border-b border-border">
        {[{ k: "laboral", l: t("laboral") || "Laboral" }, { k: "solicitudes", l: t("requests") || "Solicitudes" }].map((x) => (
          <button key={x.k} onClick={() => setTab(x.k as any)} className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === x.k ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}>{x.l}</button>
        ))}
      </div>

      {tab === "laboral" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCursor(madridToday())}>{t("today") || "Hoy"}</Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="text-sm font-medium capitalize ml-1">{monthLabel}</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t("laborable") || "Laborable"}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />{t("holiday") || "Festivo"}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{t("absence") || "Ausencia"}</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><AnimatedLoader /></div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((w) => <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="min-h-[76px] rounded-md bg-muted/10" />
                const key = ymd(d)
                const day = days[key]
                const isAbs = absenceDays.has(key)
                const cls = day?.holiday ? "border-rose-300 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/20"
                  : isAbs ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
                  : day?.working ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                  : "border-border"
                return (
                  <div key={i} className={`min-h-[76px] rounded-md border p-1 ${cls}`}>
                    <div className={`text-xs font-medium ${key === todayStr ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                    {day?.holiday && <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate">{day.holidayName || t("holiday") || "Festivo"}</div>}
                    {!day?.holiday && isAbs && <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{t("absence") || "Ausencia"}</div>}
                    {!day?.holiday && !isAbs && (day?.jobs || []).slice(0, 2).map((j: any, k: number) => (
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
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 max-w-lg">
            <div className="text-sm font-semibold">{t("newAbsenceRequest") || "Nueva solicitud de ausencia"}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("start") || "Desde"}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("end") || "Hasta"}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">{t("reason") || "Motivo"}</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[70px] text-sm" /></div>
            <div className="flex justify-end"><Button onClick={submit} disabled={submitting} className="bg-[#662D91] hover:bg-[#532073] text-white h-9 text-sm">{t("sendRequest") || "Enviar solicitud"}</Button></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">{t("myRequests") || "Mis solicitudes"}</h2>
            {absences.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("noRequestsYet") || "No has enviado solicitudes."}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {absences.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium tabular-nums">{a.startDate} → {a.endDate}</div>
                      {a.description && <div className="text-xs text-muted-foreground truncate">{a.description}</div>}
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCls[a.status] || statusCls.pending}`}>{t(a.status) || a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
