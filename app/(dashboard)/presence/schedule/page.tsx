"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

interface SchedJob { jobName: string; workCenterName: string; startTime: string | null; endTime: string | null; worked: boolean }
interface SchedDay { date: string; holiday: boolean; holidayName: string | null; absence: { type: string } | null; working: boolean; jobs: SchedJob[] }

export default function PresenceSchedulePage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [view, setView] = useState<"week" | "month">("week")
  const [cursor, setCursor] = useState(() => new Date())
  const [days, setDays] = useState<Record<string, SchedDay>>({})
  const [loading, setLoading] = useState(true)

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v

  const range = useMemo(() => {
    if (view === "month") {
      return { start: new Date(cursor.getFullYear(), cursor.getMonth(), 1), end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) }
    }
    const d = new Date(cursor)
    const dow = (d.getDay() + 6) % 7
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6) }
  }, [cursor, view])

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setLoading(true)
    fetch(`${base}/jobs/worker/my-calendar?start=${ymd(range.start)}&end=${ymd(range.end)}`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => {
        const map: Record<string, SchedDay> = {}
        ;(j?.data || []).forEach((d: SchedDay) => (map[d.date] = d))
        setDays(map)
      })
      .catch(() => setDays({}))
      .finally(() => setLoading(false))
  }, [session?.accessToken, range])

  useEffect(() => { load() }, [load])

  const step = (dir: number) => {
    const d = new Date(cursor)
    if (view === "month") d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setCursor(d)
  }

  const monthStart = new Date(range.start)
  const monthEnd = new Date(range.end)
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  if (view === "month") for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) cells.push(new Date(d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]
  const periodLabel =
    view === "month"
      ? cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" })
      : `${range.start.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`
  const todayStr = ymd(new Date())

  return (
    <div className="w-full p-3 bg-background min-h-screen space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">{t("schedule") || "Programación"}</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button onClick={() => setView("week")} className={`px-3 h-9 text-sm ${view === "week" ? "bg-[#662D91] text-white" : "bg-background"}`}>{t("week") || "Semana"}</button>
          <button onClick={() => setView("month")} className={`px-3 h-9 text-sm ${view === "month" ? "bg-[#662D91] text-white" : "bg-background"}`}>{t("month") || "Mes"}</button>
        </div>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCursor(new Date())}>{t("today") || "Hoy"}</Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium capitalize ml-1">{periodLabel}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><AnimatedLoader /></div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((w) => <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[92px] rounded-md bg-muted/10" />
            const key = ymd(d)
            const day = days[key]
            const border =
              day?.holiday ? "border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20"
              : day?.absence ? "border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20"
              : "border-border"
            return (
              <div key={i} className={`min-h-[92px] rounded-md border p-1 ${border}`}>
                <div className={`text-xs font-medium ${key === todayStr ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                {day?.holiday && <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate">{day.holidayName || t("holiday") || "Festivo"}</div>}
                {!day?.holiday && day?.absence && <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{typeLabel(day.absence.type)}</div>}
                <div className="mt-1 flex flex-col gap-1">
                  {(day?.jobs || []).map((j, k) => (
                    <div key={k} className="rounded bg-[#662D91]/10 text-[#662D91] px-1 py-0.5 text-[10px] leading-tight" title={`${j.jobName} · ${j.workCenterName}`}>
                      <div className="font-medium truncate">{j.jobName}</div>
                      {hhmm(j.startTime) && <div className="opacity-80">{hhmm(j.startTime)}{j.endTime ? `–${hhmm(j.endTime)}` : ""}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
