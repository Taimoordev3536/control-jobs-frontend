"use client"
import { localeForLanguage } from "@/lib/date-locale"

import { useTranslation } from "@/hooks/use-translation"
import { madridTodayKey } from "@/lib/datetime"

type DayStatus = "holiday" | "absence" | "working" | null

const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

// Compact 12-month overview for the "Año" view. `dayStatus` returns the state
// of a given yyyy-mm-dd so worker/client can map their own data uniformly.
export function CalendarYearGrid({
  year,
  dayStatus,
  onPickMonth,
}: {
  year: number
  dayStatus: (key: string) => DayStatus
  onPickMonth: (month: number) => void
}) {
  const { t, language } = useTranslation()
  const todayStr = madridTodayKey()
  const wd = [t("mon") || "L", t("tue") || "M", t("wed") || "X", t("thu") || "J", t("fri") || "V", t("sat") || "S", t("sun") || "D"]

  const dotCls = (s: DayStatus) =>
    s === "holiday" ? "bg-rose-500 text-white"
    : s === "absence" ? "bg-amber-500 text-white"
    : s === "working" ? "bg-emerald-500 text-white"
    : "text-foreground"

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => {
        const first = new Date(year, month, 1)
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstWeekday = (first.getDay() + 6) % 7
        const cells: (number | null)[] = []
        for (let i = 0; i < firstWeekday; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        while (cells.length % 7 !== 0) cells.push(null)
        const label = new Date(year, month, 1).toLocaleDateString(localeForLanguage(language), { month: "long" })
        return (
          <button
            key={month}
            type="button"
            onClick={() => onPickMonth(month)}
            className="text-left rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md hover:border-[#662D91] transition-all"
          >
            <div className="text-sm font-semibold capitalize mb-2 text-foreground">{label}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {wd.map((w, i) => <div key={`h${i}`} className="text-center text-[9px] font-medium text-muted-foreground">{w.charAt(0)}</div>)}
              {cells.map((d, i) => {
                if (d === null) return <div key={i} className="h-5" />
                const key = ymd(year, month, d)
                const s = dayStatus(key)
                const isToday = key === todayStr
                return (
                  <div key={i} className="flex items-center justify-center">
                    <span className={`h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-medium ${dotCls(s)} ${isToday && !s ? "ring-1 ring-[#662D91] text-[#662D91]" : ""}`}>
                      {d}
                    </span>
                  </div>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default CalendarYearGrid
