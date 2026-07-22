"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ChevronLeft, ChevronRight, CalendarClock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { localeForLanguage } from "@/lib/date-locale"
import { toast } from "@/hooks/use-toast"
import { madridToday, madridTodayKey } from "@/lib/datetime"
import ClientJobCard from "@/components/dashboards/worker-dashboard/job-card"
import ManualAttendanceRequestForm from "@/components/manual-attendance/manual-attendance-request-form"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface DaySession { id: number; checkInTime: string | null; checkOutTime: string | null; isActive: boolean }
interface DayJob { publicId: string; scheduled: boolean; session: DaySession | null }
interface WorkerDay { date: string; isHoliday: boolean; holidayName: string | null; absence: { type: string } | null; jobs: DayJob[] }
type Tab = "hoy" | "pend"

export default function MyJobsPage() {
  const { t, language } = useTranslation()
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<Tab>("hoy")
  const [cursor, setCursor] = useState(() => madridToday())
  const [formJob, setFormJob] = useState<any>(null)
  const [formDate, setFormDate] = useState<string>("")
  const [showForm, setShowForm] = useState(false)

  const dateStr = ymd(cursor)

  const { data: day = null, isLoading: dayLoading } = useQuery<WorkerDay | null>({
    queryKey: ["jobs", "worker", "day", dateStr],
    queryFn: async () => (await apiFetch<any>(`/jobs/worker/day?date=${dateStr}`))?.data ?? null,
    enabled: isAuthenticated,
  })
  const { data: allJobs = [], isLoading: allLoading } = useQuery<any[]>({
    queryKey: ["jobs", "worker", "all-jobs"],
    queryFn: async () => {
      const a = await apiFetch<any>("/jobs/worker/all-jobs")
      return Array.isArray(a?.data) ? a.data : []
    },
    enabled: isAuthenticated,
  })
  const loading = dayLoading || allLoading

  const { data: pending = [], isLoading: pendLoading } = useQuery<any[]>({
    queryKey: ["jobs", "worker", "pending", 30],
    queryFn: async () => {
      const j = await apiFetch<any>("/jobs/worker/pending?days=30")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: isAuthenticated,
  })

  const loadDay = () => {
    queryClient.invalidateQueries({ queryKey: ["jobs", "worker", "day"] })
    queryClient.invalidateQueries({ queryKey: ["jobs", "worker", "all-jobs"] })
  }
  const loadPending = () => queryClient.invalidateQueries({ queryKey: ["jobs", "worker", "pending"] })


  const step = (dir: number) => { const d = new Date(cursor); d.setDate(d.getDate() + dir); setCursor(d) }

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v

  const dateLabel = cursor.toLocaleDateString(localeForLanguage(language), { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const byPublicId = new Map(allJobs.map((j) => [j.publicId, j]))
  const cards = (day?.jobs || [])
    .map((dj) => {
      const rich = byPublicId.get(dj.publicId)
      if (!rich) return null
      const s = dj.session
      const status = s && s.checkOutTime ? "completed" : s ? "in_progress" : "scheduled"
      return { ...rich, status, jobStatus: status }
    })
    .filter(Boolean) as any[]

  const openManual = (job: any, date: string) => { setFormJob(job); setFormDate(date); setShowForm(true) }

  const tabs: { key: Tab; label: string }[] = [
    { key: "hoy", label: t("today") || "Hoy" },
    { key: "pend", label: `${t("pending") || "Pendientes"}${pending.length ? ` (${pending.length})` : ""}` },
  ]

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("jobs") || "Jobs"}</h1>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === x.key ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HOY */}
      {tab === "hoy" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCursor(madridToday())}>{t("today") || "Hoy"}</Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
            <span className="text-sm font-medium capitalize ml-1">{dateLabel}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><AnimatedLoader /></div>
          ) : (
            <>
              {day?.isHoliday && (
                <div className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm">
                  {day.holidayName || t("holiday") || "Festivo"}
                </div>
              )}
              {day?.absence && (
                <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 px-3 py-2 text-sm">
                  {typeLabel(day.absence.type)}
                </div>
              )}
              {cards.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">{t("noJobsForDay") || "No hay Jobs para este día."}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((job) => (
                    <ClientJobCard
                      key={job.publicId}
                      job={job}
                      manualOnly
                      onViewDetails={() => {}}
                      onViewRecords={() => {}}
                      onRequestManualAttendance={(j: any) => openManual(j, dateStr)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TAB 2: PENDIENTES */}
      {tab === "pend" && (
        <>
          {pendLoading ? (
            <div className="flex justify-center py-12"><AnimatedLoader /></div>
          ) : pending.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">{t("noPending") || "No tienes fichajes pendientes. ¡Todo al día!"}</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {pending.map((item) => {
                const d = new Date(`${item.date}T12:00:00`)
                const dayNum = d.getDate()
                const monthShort = d.toLocaleDateString(localeForLanguage(language), { month: "short" })
                return (
                  // The button never shrinks and its label is long, so on a phone
                  // it took the row and squeezed the job name down to one letter.
                  // Date + name share the first line; the button sits below.
                  <div key={`${item.publicId}-${item.date}`} className="rounded-xl border border-border bg-card p-3 pl-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                    <div className="flex items-center gap-4 min-w-0 sm:flex-1">
                      <div className="text-center w-12 shrink-0">
                        <div className="text-xl font-bold leading-none tabular-nums">{dayNum}</div>
                        <div className="text-[11px] text-muted-foreground uppercase">{monthShort}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{item.jobName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                          {item.workCenterName && <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{item.workCenterName}</span></span>}
                          {item.shiftStart && <span>{t("shift") || "Turno"} {item.shiftStart}</span>}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs w-full sm:w-auto shrink-0 border-purple-300 text-[#662D91] hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/40"
                      onClick={() => openManual(item, item.date)}
                    >
                      <CalendarClock className="h-3.5 w-3.5 mr-1 shrink-0" />
                      {t("requestManualCheckin") || "Solicitar fichaje manual"}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <ManualAttendanceRequestForm
        open={showForm}
        onOpenChange={setShowForm}
        job={formJob}
        preSelectedDate={formDate}
        mode="request"
        onSuccess={() => {
          toast({ title: t("requestSubmitted") || "Solicitud enviada" })
          loadDay()
          loadPending()
        }}
      />
    </div>
  )
}
