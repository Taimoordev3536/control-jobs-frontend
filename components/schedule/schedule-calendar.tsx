"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { localeForLanguage } from "@/lib/date-locale"
import { useAuth } from "@/hooks/use-auth"
import { madridToday, madridTodayKey } from "@/lib/datetime"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

interface SchedJob { jobName: string; workCenterName: string; startTime: string | null; endTime: string | null }
interface SchedDay { date: string; holiday: boolean; holidayName: string | null; absence: { type: string } | null; jobs: SchedJob[] }

// Where the calendar pulls its jobs from:
//   self          → /jobs/{worker|client}/my-calendar  (the logged-in user's own schedule)
//   client:<id>   → /jobs/client-calendar/{id}         (an employer viewing one client)
export type ScheduleSource = { mode: "self" } | { mode: "client"; clientId: string }

/**
 * Reusable job-schedule calendar (week / month). Same UI for the worker/client
 * self-view (Presence > Schedule) and the employer's Client > Calendario tab —
 * only the data source differs. Renders just the toolbar + grid so it can be
 * dropped into a full page or a tab; the caller supplies any heading/padding.
 */
export function ScheduleCalendar({ source, defaultView = "week" }: { source: ScheduleSource; defaultView?: "week" | "month" }) {
  const { t, language } = useTranslation()
  const { status } = useSession()
  const { getUserRole } = useAuth()
  const role = getUserRole()
  const isAuthenticated = status === "authenticated"

  const [view, setView] = useState<"week" | "month">(defaultView)
  const [cursor, setCursor] = useState(() => madridToday())
  // Month cells only have room for a "•N" dot on a phone, so tapping a day
  // opens this dialog with the full job list (same detail as the week cards).
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  // Self-view scope follows the logged-in role; employer view is fixed to the
  // client id passed in. `scope`/`clientId` are in the query key so switching
  // role or client refetches automatically.
  const selfScope = role === "client" ? "client" : "worker"
  const start = ymd(range.start)
  const end = ymd(range.end)

  const { data: days = {}, isLoading: loading } = useQuery<Record<string, SchedDay>>({
    queryKey:
      source.mode === "client"
        ? ["schedule", "client", source.clientId, start, end]
        : ["schedule", selfScope, start, end],
    enabled:
      source.mode === "client"
        ? isAuthenticated && !!source.clientId
        : isAuthenticated && !!role,
    queryFn: async () => {
      const url =
        source.mode === "client"
          ? `/jobs/client-calendar/${source.clientId}?start=${start}&end=${end}`
          : `/jobs/${selfScope}/my-calendar?start=${start}&end=${end}`
      const j = await apiFetch<{ data: any[] }>(url)
      // Both endpoints return a per-day list; normalize to one shape (the
      // self endpoint carries workCenterName/absence, the client one doesn't).
      const map: Record<string, SchedDay> = {}
      ;(j?.data || []).forEach((d: any) => {
        map[d.date] = {
          date: d.date,
          holiday: !!d.holiday,
          holidayName: d.holidayName ?? null,
          absence: d.absence ?? null,
          jobs: (d.jobs || []).map((jb: any) => ({
            jobName: jb.jobName,
            workCenterName: jb.workCenterName || "",
            startTime: jb.startTime ?? null,
            endTime: jb.endTime ?? null,
          })),
        }
      })
      return map
    },
  })

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
      ? cursor.toLocaleDateString(localeForLanguage(language), { month: "long", year: "numeric", timeZone: "Europe/Madrid" })
      : `${range.start.toLocaleDateString(localeForLanguage(language), { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString(localeForLanguage(language), { day: "numeric", month: "short", year: "numeric" })}`
  const todayStr = madridTodayKey()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button onClick={() => setView("week")} className={`px-3 h-9 text-sm ${view === "week" ? "bg-[#662D91] text-white" : "bg-background"}`}>{t("week") || "Semana"}</button>
          <button onClick={() => setView("month")} className={`px-3 h-9 text-sm ${view === "month" ? "bg-[#662D91] text-white" : "bg-background"}`}>{t("month") || "Mes"}</button>
        </div>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCursor(madridToday())}>{t("today") || "Hoy"}</Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium capitalize ml-1">{periodLabel}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><AnimatedLoader /></div>
      ) : (
        <>
          {/* Seven columns across a phone give each day ~55px, which truncated
              every job to "Pru…". A week is short enough to read as a vertical
              agenda instead — the layout calendars use on mobile. */}
          {view === "week" && (
            <div className="sm:hidden flex flex-col gap-2">
              {cells.filter(Boolean).map((d, i) => {
                const day = d as Date
                const key = ymd(day)
                const info = days[key]
                const isToday = key === todayStr
                const tone =
                  info?.holiday ? "border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20"
                  : info?.absence ? "border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20"
                  : isToday ? "border-[#662D91]"
                  : "border-border"
                return (
                  <div key={i} className={`rounded-lg border p-3 ${tone}`}>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className={`text-sm font-bold ${isToday ? "text-[#662D91]" : "text-foreground"}`}>
                        {weekdays[(day.getDay() + 6) % 7]} {day.getDate()}
                      </span>
                      {isToday && <span className="text-[10px] font-semibold text-[#662D91]">{t("today") || "Hoy"}</span>}
                    </div>

                    {info?.holiday ? (
                      <div className="text-xs text-rose-600 dark:text-rose-400">{info.holidayName || t("holiday") || "Festivo"}</div>
                    ) : info?.absence ? (
                      <div className="text-xs text-amber-700 dark:text-amber-400">{typeLabel(info.absence.type)}</div>
                    ) : (info?.jobs || []).length === 0 ? (
                      <div className="text-xs text-muted-foreground">{t("noJobs") || "Sin trabajos"}</div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {(info?.jobs || []).map((j, k) => (
                          <div key={k} className="rounded-md bg-[#662D91]/10 px-2.5 py-1.5">
                            <div className="text-[13px] font-semibold text-[#662D91] break-words">{j.jobName}</div>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                              {j.workCenterName && <span className="break-words">{j.workCenterName}</span>}
                              {hhmm(j.startTime) && <span className="tabular-nums">{hhmm(j.startTime)}{j.endTime ? `–${hhmm(j.endTime)}` : ""}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Month keeps the calendar grid at every size — that shape IS the
              information. Week uses the grid from sm upwards. */}
          <div className={`${view === "week" ? "hidden sm:grid" : "grid"} grid-cols-7 gap-1`}>
            {weekdays.map((w) => <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[92px] rounded-md bg-muted/10" />
              const key = ymd(d)
              const day = days[key]
              const border =
                day?.holiday ? "border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20"
                : day?.absence ? "border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20"
                : "border-border"
              const jobCount = (day?.jobs || []).length
              const clickable = jobCount > 0
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setSelectedDay(key)}
                  className={`min-h-[64px] sm:min-h-[92px] rounded-md border p-1 text-left w-full ${border} ${clickable ? "cursor-pointer hover:bg-muted/40 transition-colors" : "cursor-default"}`}
                >
                  <div className={`text-xs font-medium ${key === todayStr ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                  {day?.holiday && <div className="hidden sm:block text-[10px] text-rose-600 dark:text-rose-400 truncate">{day.holidayName || t("holiday") || "Festivo"}</div>}
                  {!day?.holiday && day?.absence && <div className="hidden sm:block text-[10px] text-amber-700 dark:text-amber-400 truncate">{typeLabel(day.absence.type)}</div>}

                  {/* A truncated name in a 55px cell says nothing; a count does. */}
                  {jobCount > 0 && (
                    <div className="sm:hidden mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#662D91]" />
                      <span className="text-[10px] font-semibold text-[#662D91]">{jobCount}</span>
                    </div>
                  )}

                  <div className="hidden sm:flex mt-1 flex-col gap-1">
                    {(day?.jobs || []).map((j, k) => (
                      <div key={k} className="rounded bg-[#662D91]/10 text-[#662D91] px-1 py-0.5 text-[10px] leading-tight" title={`${j.jobName} · ${j.workCenterName}`}>
                        <div className="font-medium truncate">{j.jobName}</div>
                        {hhmm(j.startTime) && <div className="opacity-80">{hhmm(j.startTime)}{j.endTime ? `–${hhmm(j.endTime)}` : ""}</div>}
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Day detail — tapping a month cell (or its "•N" dot on mobile) opens the
          full job list for that day, mirroring the week-view cards. */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedDay
                ? new Date(`${selectedDay}T12:00:00`).toLocaleDateString(localeForLanguage(language), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" })
                : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (() => {
            const info = days[selectedDay]
            if (info?.holiday) return <div className="text-sm text-rose-600 dark:text-rose-400">{info.holidayName || t("holiday") || "Festivo"}</div>
            if (info?.absence) return <div className="text-sm text-amber-700 dark:text-amber-400">{typeLabel(info.absence.type)}</div>
            const jobs = info?.jobs || []
            if (jobs.length === 0) return <div className="text-sm text-muted-foreground">{t("noJobs") || "Sin trabajos"}</div>
            return (
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                {jobs.map((j, k) => (
                  <div key={k} className="rounded-md bg-[#662D91]/10 px-3 py-2">
                    <div className="text-sm font-semibold text-[#662D91] break-words">{j.jobName}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                      {j.workCenterName && <span className="break-words">{j.workCenterName}</span>}
                      {hhmm(j.startTime) && <span className="tabular-nums">{hhmm(j.startTime)}{j.endTime ? `–${hhmm(j.endTime)}` : ""}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
