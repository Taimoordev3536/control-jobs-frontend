"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { PlanificadorDialog } from "@/components/occupation/planificador-dialog"

interface Cell {
  workerId: string
  date: string
  jobName: string
  workCenterName: string
  startTime: string | null
  endTime: string | null
}

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

export default function OccupationPage() {
  const { t } = useTranslation()
  const { data: session } = useSession()

  const [view, setView] = useState<"week" | "month">("week")
  const [cursor, setCursor] = useState(() => new Date())
  const [allWorkers, setAllWorkers] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [data, setData] = useState<{ workers: { id: string; name: string }[]; days: string[]; cells: Cell[]; holidays?: Record<string, string> }>({ workers: [], days: [], cells: [], holidays: {} })
  const [loading, setLoading] = useState(true)
  const [plannerOpen, setPlannerOpen] = useState(false)

  const range = useMemo(() => {
    if (view === "month") {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      return { start, end }
    }
    const d = new Date(cursor)
    const dow = (d.getDay() + 6) % 7
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    return { start, end }
  }, [cursor, view])

  useEffect(() => {
    if (!session?.accessToken) return
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => {
        const rows = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
        setAllWorkers(rows.map((w: any) => ({ id: w.publicId, name: w.name || w.code })))
      })
      .catch(() => setAllWorkers([]))
  }, [session?.accessToken])

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setLoading(true)
    try {
      const q = `start=${ymd(range.start)}&end=${ymd(range.end)}${selected.length ? `&workerIds=${selected.join(",")}` : ""}`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/occupation?${q}`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      const body = await res.json()
      setData(body?.data || { workers: [], days: [], cells: [], holidays: {} })
    } catch {
      setData({ workers: [], days: [], cells: [], holidays: {} })
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, range, selected])

  useEffect(() => { load() }, [load])

  const grid = useMemo(() => {
    const m: Record<string, Record<string, Cell[]>> = {}
    for (const c of data.cells) {
      ;(m[c.workerId] ||= {})[c.date] ||= []
      m[c.workerId][c.date].push(c)
    }
    return m
  }, [data])

  const step = (dir: number) => {
    const d = new Date(cursor)
    if (view === "month") d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setCursor(d)
  }

  const periodLabel =
    view === "month"
      ? cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" })
      : `${range.start.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`

  const todayStr = ymd(new Date())
  const toggleWorker = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="w-full p-3 bg-background min-h-screen space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">{t("occupation") || "Ocupación"}</h1>
        <Button onClick={() => setPlannerOpen(true)} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
          <MapPin className="h-4 w-4 mr-1" />
          {t("planner") || "Planificador"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button onClick={() => setView("week")} className={`px-3 h-9 text-sm ${view === "week" ? "bg-[#662D91] text-white" : "bg-background text-foreground"}`}>{t("week") || "Semana"}</button>
          <button onClick={() => setView("month")} className={`px-3 h-9 text-sm ${view === "month" ? "bg-[#662D91] text-white" : "bg-background text-foreground"}`}>{t("month") || "Mes"}</button>
        </div>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCursor(new Date())}>{t("today") || "Hoy"}</Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-1" onClick={() => step(1)}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium capitalize ml-1">{periodLabel}</span>

        <div className="relative ml-auto">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setShowPicker((v) => !v)}>
            <Users className="h-4 w-4 mr-1" />
            {selected.length ? `${selected.length} ${t("workers") || "Trabajadores"}` : t("allWorkers") || "Todos"}
          </Button>
          {showPicker && (
            <div className="absolute right-0 mt-1 z-20 w-64 max-h-72 overflow-y-auto rounded-md border border-border bg-background shadow-lg p-2 space-y-1">
              <div className="flex justify-between px-1 pb-1 border-b border-border">
                <button className="text-xs text-[#662D91]" onClick={() => setSelected(allWorkers.map((w) => w.id))}>{t("selectAll") || "Todos"}</button>
                <button className="text-xs text-muted-foreground" onClick={() => setSelected([])}>{t("clear") || "Limpiar"}</button>
              </div>
              {allWorkers.map((w) => (
                <label key={w.id} className="flex items-center gap-2 text-sm px-1 py-0.5 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggleWorker(w.id)} />
                  <span className="truncate">{w.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><AnimatedLoader /></div>
      ) : data.workers.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">{t("noOccupationData") || "No scheduled occupation for this period"}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-purple-50 dark:bg-purple-950/50 border-b border-r border-border px-3 py-2 text-left font-semibold min-w-[160px]">{t("worker") || "Trabajador"}</th>
                {data.days.map((d) => {
                  const dd = new Date(`${d}T12:00:00`)
                  const weekend = dd.getDay() === 0 || dd.getDay() === 6
                  const holidayName = data.holidays?.[d]
                  const holiday = holidayName !== undefined
                  return (
                    <th key={d} title={holiday ? holidayName || t("holiday") || "Festivo" : ""} className={`border-b border-r border-border px-2 py-1 text-center font-medium min-w-[92px] ${holiday ? "bg-rose-50 dark:bg-rose-950/30" : weekend ? "bg-muted/40" : "bg-purple-50 dark:bg-purple-950/50"} ${d === todayStr ? "text-[#662D91]" : ""}`}>
                      <div className="capitalize text-[11px]">{dd.toLocaleDateString("es-ES", { weekday: "short" })}</div>
                      <div className="text-xs">{dd.getDate()}</div>
                      {holiday && <div className="text-[9px] text-rose-600 dark:text-rose-400 truncate leading-none">{t("holiday") || "Festivo"}</div>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {data.workers.map((w, i) => (
                <tr key={w.id} className={i % 2 ? "bg-muted/20" : "bg-background"}>
                  <td className="sticky left-0 z-10 bg-inherit border-b border-r border-border px-3 py-2 font-medium whitespace-nowrap">{w.name}</td>
                  {data.days.map((d) => {
                    const jobs = grid[w.id]?.[d] || []
                    return (
                      <td key={d} className="border-b border-r border-border px-1 py-1 align-top text-center">
                        {jobs.length === 0 ? (
                          <span className="text-muted-foreground/40">·</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {jobs.map((j, k) => (
                              <div key={k} className="rounded bg-[#662D91]/10 text-[#662D91] px-1 py-0.5 text-[10px] leading-tight" title={`${j.jobName} · ${j.workCenterName}`}>
                                <div className="font-medium truncate">{j.jobName}</div>
                                {hhmm(j.startTime) && <div className="opacity-80">{hhmm(j.startTime)}{j.endTime ? `–${hhmm(j.endTime)}` : ""}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlanificadorDialog open={plannerOpen} onOpenChange={setPlannerOpen} defaultDate={todayStr} />
    </div>
  )
}
