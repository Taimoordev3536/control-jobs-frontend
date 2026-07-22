"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { localeForLanguage } from "@/lib/date-locale"
import { madridToday, madridTodayKey } from "@/lib/datetime"
import { CalendarYearGrid } from "@/components/ui/calendar-year-grid"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * The worker "work" calendar (month + year views, working/holiday/absence
 * colouring, job names per day). Extracted from the /calendar page so the
 * employer's worker-detail Calendar tab renders the SAME UI instead of its old
 * mock grid.
 *
 * @param workerId  Worker publicId. Omitted → the logged-in worker's own
 *   calendar (/jobs/worker/my-calendar). Provided → that worker's calendar
 *   (/jobs/worker-calendar/:publicId), used by the employer view.
 */
export function WorkerWorkCalendar({ workerId }: { workerId?: string }) {
  const { t, language } = useTranslation()
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"
  const todayStr = madridTodayKey()

  const [cursor, setCursor] = useState(() => madridToday())
  const [view, setView] = useState<"month" | "year">("month")

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const rangeStart = view === "year" ? new Date(cursor.getFullYear(), 0, 1) : monthStart
  const rangeEnd = view === "year" ? new Date(cursor.getFullYear(), 11, 31) : monthEnd

  const { data: days = {}, isLoading } = useQuery<Record<string, any>>({
    // workerId in the key so switching workers doesn't show a cached calendar.
    queryKey: ["calendar", "work", workerId || "me", ymd(rangeStart), ymd(rangeEnd)],
    queryFn: async () => {
      const path = workerId
        ? `/jobs/worker-calendar/${workerId}?start=${ymd(rangeStart)}&end=${ymd(rangeEnd)}`
        : `/jobs/worker/my-calendar?start=${ymd(rangeStart)}&end=${ymd(rangeEnd)}`
      const j = await apiFetch<any>(path)
      const map: Record<string, any> = {}
      ;(j?.data || []).forEach((d: any) => (map[d.date] = d))
      return map
    },
    enabled: isAuthenticated && (workerId === undefined || !!workerId),
  })

  const step = (dir: number) =>
    setCursor((c) =>
      view === "year"
        ? new Date(c.getFullYear() + dir, c.getMonth(), 1)
        : new Date(c.getFullYear(), c.getMonth() + dir, 1),
    )
  const monthLabel = cursor.toLocaleDateString(localeForLanguage(language), { month: "long", year: "numeric" })
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) cells.push(new Date(d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v

  return (
    <div className="space-y-4">
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
      {isLoading ? (
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
    </div>
  )
}

export default WorkerWorkCalendar
