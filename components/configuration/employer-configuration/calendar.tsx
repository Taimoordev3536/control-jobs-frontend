"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { madridToday, madridTodayKey } from "@/lib/datetime"

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function CalendarConfig() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const authHeader = { Authorization: `Bearer ${session?.accessToken}` }

  const [cursor, setCursor] = useState(() => { const d = madridToday(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [newDate, setNewDate] = useState(madridTodayKey())
  const [newName, setNewName] = useState("")

  const holidaysKey = ["employers", "me", "holidays"]
  const { data: holidays = [], isLoading: loading } = useQuery<{ id: string; date: string; name: string | null }[]>({
    queryKey: holidaysKey,
    queryFn: async () => {
      const j = await apiFetch<any>("/employers/me/holidays")
      return Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    },
    enabled: !!session?.accessToken,
  })
  // add/delete handlers hit the API directly; these refresh the read.
  const load = () => queryClient.invalidateQueries({ queryKey: holidaysKey })
  const setHolidays = (updater: (prev: any[]) => any[]) =>
    queryClient.setQueryData(holidaysKey, (prev: any[] = []) => updater(prev))

  const mStart = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
  const mEnd = ymd(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
  const { data: workDays = new Set<string>() } = useQuery<Set<string>>({
    queryKey: ["jobs", "occupation", "workdays", mStart, mEnd],
    queryFn: async () => {
      const j = await apiFetch<any>(`/jobs/occupation?start=${mStart}&end=${mEnd}`)
      return new Set<string>((j?.data?.cells || []).map((c: any) => c.date))
    },
    enabled: !!session?.accessToken,
  })

  const byDate = useMemo(() => {
    const m: Record<string, { id: string; name: string | null }> = {}
    holidays.forEach((h) => (m[h.date] = { id: h.id, name: h.name }))
    return m
  }, [holidays])

  const add = async (date: string, name: string) => {
    try {
      const res = await fetch(`${base}/employers/me/holidays`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ date, name: name || null }),
      })
      if (!res.ok) throw new Error("add failed")
      setNewName("")
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`${base}/employers/me/holidays/${id}`, { method: "DELETE", headers: authHeader })
      setHolidays((p) => p.filter((h) => h.id !== id))
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weekdays = [t("mon") || "Lun", t("tue") || "Mar", t("wed") || "Mié", t("thu") || "Jue", t("fri") || "Vie", t("sat") || "Sáb", t("sun") || "Dom"]
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" })

  const toggleDay = (d: Date) => {
    const key = ymd(d)
    const h = byDate[key]
    if (h) remove(h.id)
    else add(key, "")
  }

  const monthHolidays = holidays.filter((h) => h.date >= ymd(monthStart) && h.date <= ymd(monthEnd))

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">{t("calendarHint") || "Mark public holidays (festivos). Click a day to toggle it."}</p>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{monthLabel}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const d = madridToday(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>{t("today") || "Hoy"}</Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-1" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><AnimatedLoader /></div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((w) => <div key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[52px] rounded-md bg-muted/10" />
            const key = ymd(d)
            const h = byDate[key]
            const works = workDays.has(key)
            return (
              <button
                key={i}
                onClick={() => toggleDay(d)}
                title={h?.name || (works ? t("workingDay") || "Día laborable" : "")}
                className={`min-h-[52px] rounded-md border p-1 text-left transition-colors ${h ? "border-[#662D91] bg-[#662D91]/10" : works ? "border-green-300 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 hover:bg-green-100/60" : "border-border hover:bg-muted/40"}`}
              >
                <div className={`text-xs font-medium ${h ? "text-[#662D91]" : "text-foreground"}`}>{d.getDate()}</div>
                {h?.name && <div className="text-[10px] text-[#662D91] truncate">{h.name}</div>}
                {!h && works && <div className="text-[10px] text-green-700 dark:text-green-400">{t("workShort") || "Trabajo"}</div>}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <div className="w-40">
          <label className="text-xs text-muted-foreground">{t("date") || "Fecha"}</label>
          <DateInput value={newDate} onChange={(e) => setNewDate(e.target.value)} allowPastDates className="h-9" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">{t("name") || "Nombre"} ({t("optional") || "Opcional"})</label>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("holidayNamePlaceholder") || "p. ej. Navidad"} className="h-9" />
        </div>
        <Button onClick={() => newDate && add(newDate, newName)} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
          <Plus className="h-4 w-4 mr-1" />{t("add") || "Añadir"}
        </Button>
      </div>

      {monthHolidays.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {monthHolidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{h.date}{h.name ? ` · ${h.name}` : ""}</span>
              <button onClick={() => remove(h.id)} className="p-1 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
