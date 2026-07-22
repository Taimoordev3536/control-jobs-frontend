"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { localeForLanguage } from "@/lib/date-locale"
import { useAuth } from "@/hooks/use-auth"
import { madridToday, madridTodayKey } from "@/lib/datetime"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

interface SchedJob { jobName: string; workCenterName: string; startTime: string | null; endTime: string | null; worked: boolean }
interface SchedDay { date: string; holiday: boolean; holidayName: string | null; absence: { type: string } | null; working: boolean; jobs: SchedJob[] }

export default function PresenceSchedulePage() {
  const { t, language } = useTranslation()
  const { status } = useSession()
  const { getUserRole } = useAuth()
  const role = getUserRole()
  const scope = role === "client" ? "client" : "worker"
  const isAuthenticated = status === "authenticated"

  const [view, setView] = useState<"week" | "month">("week")
  const [cursor, setCursor] = useState(() => madridToday())

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

  // `scope` is IN the query key: previously the raw effect captured a stale
  // scope="worker" when getUserRole() hadn't resolved yet, then never
  // refetched once the role became "client" (scope wasn't in its deps) —
  // that's exactly why a client saw an empty schedule until refresh. Now the
  // key changes worker->client and React Query refetches automatically.
  // Query also stays disabled until the role is known, so no wrong-scope call.
  const { data: days = {}, isLoading: loading } = useQuery<Record<string, SchedDay>>({
    queryKey: ["schedule", scope, ymd(range.start), ymd(range.end)],
    queryFn: async () => {
      const j = await apiFetch<{ data: SchedDay[] }>(
        `/jobs/${scope}/my-calendar?start=${ymd(range.start)}&end=${ymd(range.end)}`,
      )
      const map: Record<string, SchedDay> = {}
      ;(j?.data || []).forEach((d: SchedDay) => (map[d.date] = d))
      return map
    },
    enabled: isAuthenticated && !!role,
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
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">{t("schedule") || "Programación"}</h1>

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
              return (
                <div key={i} className={`min-h-[64px] sm:min-h-[92px] rounded-md border p-1 ${border}`}>
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
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
