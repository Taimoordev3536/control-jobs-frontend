"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { madridToday, madridTodayKey } from "@/lib/datetime"

interface ClientCalendarioTabProps {
  clientId: string
}

interface CalDay {
  date: string
  jobs: { jobId: string; jobName: string; startTime: string | null; endTime: string | null; workerCount: number }[]
  holiday?: boolean
  holidayName?: string | null
}

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

export function ClientCalendarioTab({ clientId }: ClientCalendarioTabProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [cursor, setCursor] = useState(() => {
    const d = madridToday()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [days, setDays] = useState<Record<string, CalDay>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor])
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor])

  const load = useCallback(async () => {
    if (!session?.accessToken || !clientId) return
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/client-calendar/${clientId}?start=${ymd(monthStart)}&end=${ymd(monthEnd)}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      )
      const body = await res.json()
      const list: CalDay[] = Array.isArray(body?.data) ? body.data : []
      const map: Record<string, CalDay> = {}
      list.forEach((d) => (map[d.date] = d))
      setDays(map)
    } catch {
      setDays({})
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, clientId, monthStart, monthEnd])

  useEffect(() => {
    load()
    setSelected(null)
  }, [load])

  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" })

  // Monday-first offset for the 1st of the month.
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = madridTodayKey()
  const selectedDay = selected ? days[selected] : null

  return (
    <div className="space-y-3 p-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-foreground">{monthLabel}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const d = madridToday(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>
            {t("today") || "Hoy"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <AnimatedLoader />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {weekdays.map((w) => (
              <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[64px] rounded-md bg-muted/10" />
              const key = ymd(d)
              const day = days[key]
              const count = day?.jobs.length || 0
              const isToday = key === todayStr
              const isSel = key === selected
              const holiday = day?.holiday
              return (
                <button
                  key={i}
                  onClick={() => setSelected(count ? key : null)}
                  title={holiday ? day?.holidayName || t("holiday") || "Festivo" : ""}
                  className={`min-h-[64px] rounded-md border p-1 text-left transition-colors ${
                    isSel ? "border-[#662D91] bg-purple-50 dark:bg-purple-950/40" : holiday ? "border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/20" : "border-border hover:bg-muted/40"
                  } ${count ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className={`text-xs font-medium ${isToday ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                  {holiday && <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate">{day?.holidayName || t("holiday") || "Festivo"}</div>}
                  {count > 0 && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-[#662D91]/10 text-[#662D91] px-1.5 py-0.5 text-[10px] font-semibold">
                      {count} {count === 1 ? t("job") || "Job" : t("jobs") || "Jobs"}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {selectedDay && (
            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-semibold mb-2">
                {new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" })}
              </div>
              <ul className="divide-y divide-border">
                {selectedDay.jobs.map((j) => (
                  <li key={j.jobId} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="font-medium truncate">{j.jobName}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {hhmm(j.startTime) ? `${hhmm(j.startTime)}${j.endTime ? ` – ${hhmm(j.endTime)}` : ""}` : "—"}
                      {` · ${j.workerCount} ${t("workers") || "Trabajadores"}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
