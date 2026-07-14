"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { madridToday, madridTodayKey, formatLocalTime } from "@/lib/datetime"
import ClientJobCard from "@/components/dashboards/worker-dashboard/job-card"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function ClientControl() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [cursor, setCursor] = useState(() => madridToday())
  const [day, setDay] = useState<any | null>(null)
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)

  const dateStr = ymd(cursor)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    const h = { Authorization: `Bearer ${session.accessToken}` }
    setLoading(true)
    Promise.all([
      fetch(`${base}/jobs/client/day?date=${dateStr}`, { headers: h }).then((r) => r.json()),
      fetch(`${base}/jobs/client/all-jobs`, { headers: h }).then((r) => r.json()),
    ])
      .then(([d, a]) => {
        setDay(d?.data || null)
        setAllJobs(Array.isArray(a?.data) ? a.data : [])
      })
      .catch(() => { setDay(null); setAllJobs([]) })
      .finally(() => setLoading(false))
  }, [session?.accessToken, base, dateStr])

  useEffect(() => { load() }, [load])

  const step = (dir: number) => { const d = new Date(cursor); d.setDate(d.getDate() + dir); setCursor(d) }
  const dateLabel = cursor.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const byPublicId = new Map(allJobs.map((j) => [j.publicId, j]))
  const cards = (day?.jobs || [])
    .map((dj: any) => {
      const rich = byPublicId.get(dj.publicId)
      if (!rich) return null
      return { ...rich, status: dj.status, jobStatus: dj.status, _workers: dj.workers || [] }
    })
    .filter(Boolean) as any[]

  const isToday = dateStr === madridTodayKey()
  const runningCount = cards.filter((c) => c.status === "in_progress").length

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("control") || "Control"}</h1>

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
          {isToday && runningCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm font-medium">
              <Radio className="h-4 w-4" /> {runningCount} {runningCount === 1 ? (t("jobRunning") || "Job en ejecución ahora") : (t("jobsRunning") || "Jobs en ejecución ahora")}
            </div>
          )}
          {day?.isHoliday && (
            <div className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm">
              {day.holidayName || t("holiday") || "Festivo"}
            </div>
          )}
          {cards.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">{t("noJobsForDay") || "No hay Jobs para este día."}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((job) => (
                <ClientJobCard key={job.publicId} job={job} onViewDetails={() => setSelected(job)} onViewRecords={() => {}} showEnter={false} recordsHref="/records/client" />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader><DialogTitle>{selected?.jobName || selected?.title}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">{selected.workCenterName || selected.workCenters?.[0]?.name}</div>
              {(selected._workers || []).length === 0 ? (
                <div className="text-muted-foreground">{t("noCheckinsYet") || "Sin fichajes para este día."}</div>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {selected._workers.map((w: any, i: number) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${w.active ? "bg-emerald-500" : w.checkOutTime ? "bg-purple-600" : "bg-muted-foreground"}`} />
                        {w.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {w.checkInTime ? formatLocalTime(w.checkInTime) : "—"}{w.checkOutTime ? ` · ${formatLocalTime(w.checkOutTime)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
