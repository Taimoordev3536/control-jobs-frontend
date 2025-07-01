"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export function WorkerCalendarTab() {
  const { t } = useTranslation()
  const [currentYear, setCurrentYear] = useState(2025)
  const [viewMode, setViewMode] = useState<"year" | "month">("year")

  const months = [
    t("january"),
    t("february"),
    t("march"),
    t("april"),
    t("may"),
    t("june"),
    t("july"),
    t("august"),
    t("september"),
    t("october"),
    t("november"),
    t("december"),
  ]

  const weekDays = [t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")]

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  }

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(monthIndex, currentYear)
    const firstDay = getFirstDayOfMonth(monthIndex, currentYear)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1
      const prevYear = monthIndex === 0 ? currentYear - 1 : currentYear
      const prevMonthDays = getDaysInMonth(prevMonth, prevYear)
      const day = prevMonthDays - firstDay + i + 1
      days.push(
        <div key={`prev-${i}`} className="p-1 text-center text-xs text-muted-foreground">
          {day}
        </div>,
      )
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <div key={day} className="p-1 text-center text-xs hover:bg-muted/50 cursor-pointer rounded">
          {day}
        </div>,
      )
    }

    // Add empty cells for days after the last day of the month
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    const remainingCells = totalCells - (firstDay + daysInMonth)
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div key={`next-${i}`} className="p-1 text-center text-xs text-muted-foreground">
          {i}
        </div>,
      )
    }

    return (
      <div className="border border-border rounded-lg p-3">
        <h3 className="font-semibold text-center mb-2 text-foreground">{months[monthIndex]}</h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-xs font-medium text-center text-muted-foreground p-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-300"></div>
          <span className="text-foreground">{t("workingDays")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span className="text-foreground">{t("holidays")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400"></div>
          <span className="text-foreground">{t("vacation")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500"></div>
          <span className="text-foreground">{t("permissions")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600"></div>
          <span className="text-foreground">{t("lows")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500"></div>
          <span className="text-foreground">{t("compensation")}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentYear(currentYear - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentYear(currentYear + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            {t("today")}
          </Button>
        </div>

        <h2 className="text-2xl font-bold text-foreground">{currentYear}</h2>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "year" ? "default" : "outline"}
            size="sm"
            className={viewMode === "year" ? "bg-purple-600 hover:bg-purple-700" : ""}
            onClick={() => setViewMode("year")}
          >
            {t("year")}
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            className={viewMode === "month" ? "bg-purple-600 hover:bg-purple-700" : ""}
            onClick={() => setViewMode("month")}
          >
            {t("month")}
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-3 gap-4">{months.slice(0, 6).map((_, index) => renderMonth(index))}</div>

      {viewMode === "year" && (
        <div className="grid grid-cols-3 gap-4">{months.slice(6, 12).map((_, index) => renderMonth(index + 6))}</div>
      )}
    </div>
  )
}
