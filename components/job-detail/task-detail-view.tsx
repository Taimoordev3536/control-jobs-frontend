"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Bell,
  RotateCcw,
  Play,
  Stamp as Stop,
  Send as Sync,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface TaskDetailViewProps {
  taskId: string
}

interface TaskData {
  id: number
  name: string
  note: string
  expectedDuration: number
  shift: string
  timing: string
  periodicity: string
  alertTask: boolean
  jobId: number
  jobName: string
  clientName: string
  workCenter: string
  workerName: string
  weeklyDays?: string
  monthlyDays?: number[] | string
  onceDate?: string | null
  startDate: string
  endDate?: string
  interval: number
  periodicityValue?: string
}

export default function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const { t } = useTranslation("job-detail")
  const { session } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [task, setTask] = useState<TaskData | null>(null)
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduledDates, setScheduledDates] = useState<Date[]>([])
  const [recurrenceLoading, setRecurrenceLoading] = useState(false)
  const [recurrenceError, setRecurrenceError] = useState<string | null>(null)
  const [recurrenceFetched, setRecurrenceFetched] = useState(false)

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !session?.accessToken) return

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/json",
          },
        })

        const json = await res.json()
        if (!json?.isSuccess) {
          console.error("Failed to fetch task", json)
          setIsLoading(false)
          return
        }

        const data = json.data

        // normalize fields to match TaskData shape used by the component
        const normalized: TaskData = {
          id: data.id,
          name: data.name,
          note: data.note,
          expectedDuration: data.expectedDuration,
          shift: data.shift,
          timing: data.timing,
          periodicity: data.periodicity,
          alertTask: !!data.alertTask,
          jobId: data.job?.id || data.jobId,
          jobName: data.job?.jobName || data.jobName || "",
          clientName: data.job?.clientName || data.clientName || "",
          workCenter: data.job?.workCenter || data.workCenter || "",
          workerName: data.workerName || "",
          weeklyDays: data.weeklyDays
            ? Array.isArray(data.weeklyDays)
              ? data.weeklyDays.join(",")
              : data.weeklyDays
            : undefined,
          startDate: data.startDate ? String(data.startDate) : "",
          endDate: data.endDate || "",
          interval: data.interval || 1,
          periodicityValue: data.periodicityValue || "",
        }

        setTask(normalized)
        // Pre-fill scheduledDates using client-side calculation as a fallback
        calculateScheduledDates(normalized, data)
      } catch (error) {
        console.error("Error fetching task:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [taskId, session?.accessToken])

  // When the recurrence panel is opened, fetch generated recurrence from backend
  useEffect(() => {
    if (!showRecurrence) return
    if (!taskId || !session?.accessToken) return
    // avoid re-fetching if already fetched in this session
    if (recurrenceFetched) return

    const fetchRecurrence = async () => {
      setRecurrenceLoading(true)
      setRecurrenceError(null)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks/${taskId}/generate-recurrence`, {
          headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/json" },
        })
        const json = await res.json()
        if (!json?.isSuccess) {
          console.error("Failed to fetch recurrence", json)
          setRecurrenceError(json?.message || "Failed to fetch recurrence")
          setRecurrenceLoading(false)
          setRecurrenceFetched(true)
          return
        }

        const data = json.data
        // parse occurrences into Date[] (API returns ISO strings)
        const occ: Date[] = Array.isArray(data?.occurrences) ? data.occurrences.map((s: string) => new Date(s)) : []
        setScheduledDates(occ)
        // update periodicityValue if provided by API
        if (data?.periodicityValue && task) setTask({ ...task, periodicityValue: data.periodicityValue })
        setRecurrenceLoading(false)
        setRecurrenceFetched(true)
      } catch (err: any) {
        console.error("Error fetching recurrence", err)
        setRecurrenceError(err?.message || String(err))
        setRecurrenceLoading(false)
        setRecurrenceFetched(true)
      }
    }

    fetchRecurrence()
  }, [showRecurrence, taskId, session?.accessToken, recurrenceFetched, task])

  const calculateScheduledDates = (taskData: TaskData, rawData?: any) => {
    const dates: Date[] = []
    const startDate = taskData.startDate ? new Date(taskData.startDate) : new Date()
    const endDate = taskData.endDate ? new Date(taskData.endDate) : new Date(2026, 11, 31)

    if (taskData.periodicity === "weekly" && taskData.weeklyDays) {
      const weekDays = taskData.weeklyDays.split(",").map((d) => Number.parseInt(d.trim()))
      const intervalWeeks = taskData.interval || 1

      const currentWeekStart = new Date(startDate)
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())

      while (currentWeekStart <= endDate) {
        weekDays.forEach((dayOfWeek) => {
          const scheduleDate = new Date(currentWeekStart)
          scheduleDate.setDate(currentWeekStart.getDate() + dayOfWeek)

          if (scheduleDate >= startDate && scheduleDate <= endDate) {
            dates.push(new Date(scheduleDate))
          }
        })

        currentWeekStart.setDate(currentWeekStart.getDate() + 7 * intervalWeeks)
      }
    }

    // Monthly periodicity: use monthlyDays from raw data when available
    if (taskData.periodicity === "monthly") {
      // monthlyDays may be provided in rawData as array of strings or numbers
      const monthlyDaysRaw = rawData?.monthlyDays ?? rawData?.monthlyDays ?? null
      let monthlyDays: number[] = []

      if (Array.isArray(monthlyDaysRaw) && monthlyDaysRaw.length > 0) {
        monthlyDays = monthlyDaysRaw.map((d: any) => Number(d))
      } else if (rawData?.monthlyDays && typeof rawData.monthlyDays === "string") {
        monthlyDays = rawData.monthlyDays.split(",").map((d: any) => Number(d.trim()))
      }

      // If no monthlyDays in rawData, try parse from taskData.monthlyDays if present as CSV
      if (monthlyDays.length === 0 && (taskData as any).monthlyDays) {
        const md = (taskData as any).monthlyDays
        if (Array.isArray(md)) monthlyDays = md.map((d: any) => Number(d))
        else if (typeof md === "string") monthlyDays = md.split(",").map((d: any) => Number(d.trim()))
      }

      if (monthlyDays.length > 0) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const dateCursor = new Date(start.getFullYear(), start.getMonth(), 1)

        while (dateCursor <= end) {
          const year = dateCursor.getFullYear()
          const month = dateCursor.getMonth()

          monthlyDays.forEach((day) => {
            // if day is within month
            const candidate = new Date(year, month, day)
            if (candidate >= startDate && candidate <= endDate) {
              dates.push(candidate)
            }
          })

          // advance by one month * interval
          const intervalMonths = taskData.interval || 1
          dateCursor.setMonth(dateCursor.getMonth() + intervalMonths)
        }
      }
    }

    // sort and unique
    const unique = Array.from(new Map(dates.map((d) => [d.toDateString(), d])).values())
    unique.sort((a, b) => a.getTime() - b.getTime())

    setScheduledDates(unique)
  }

  const getPriorityClass = (note: string) => {
    switch (note?.toLowerCase()) {
      case "vip":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
      case "gfg":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    }
  }

  // Updated generateCalendar function
  const generateCalendar = () => {
    const monthNames = [
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
    const dayNames = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")]

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const firstDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const calendarDays = []
    const today = new Date()

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), -(firstDayOfWeek - 1 - i))
      calendarDays.push(
        <div
          key={`prev-${i}`}
          className="p-2 text-center text-muted-foreground/50 bg-muted/20 min-h-[40px] flex items-center justify-center text-sm"
        >
          {prevMonthDate.getDate()}
        </div>,
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentCalendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      let classes =
        "p-2 text-center border border-border/50 bg-card hover:bg-muted/30 cursor-pointer transition-all duration-300 min-h-[40px] flex items-center justify-center relative text-sm font-medium hover:shadow-md"

      const isToday = today.toDateString() === currentCalendarDate.toDateString()
      const isScheduled = scheduledDates.some(
        (scheduledDate) => scheduledDate.toDateString() === currentCalendarDate.toDateString(),
      )

      if (isToday) {
        classes += " bg-yellow-400 text-white font-bold shadow-lg ring-2 ring-yellow-300 ring-offset-2"
      } else if (isScheduled) {
        classes += " bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 font-semibold shadow-md"
      }

      calendarDays.push(
        <div key={day} className={classes}>
          {day}
          {isScheduled && !isToday && (
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full shadow-sm"></div>
          )}
          {isToday && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>}
        </div>,
      )
    }

    // Add remaining cells to complete the grid
    const totalCells = calendarDays.length
    const remainingCells = Math.ceil(totalCells / 7) * 7 - totalCells

    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      calendarDays.push(
        <div
          key={`next-${i}`}
          className="p-2 text-center text-muted-foreground/50 bg-muted/20 min-h-[40px] flex items-center justify-center text-sm"
        >
          {nextMonthDate.getDate()}
        </div>,
      )
    }

    return { monthNames, dayNames, calendarDays }
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getTranslatedDayName = (date: Date) => {
    const dayIndex = date.getDay()
    const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return t(dayKeys[dayIndex])
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("taskNotFound")}</h2>
          <p className="text-muted-foreground mb-4">{t("taskNotFoundDescription")}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
        </div>
      </div>
    )
  }

  const { monthNames, dayNames, calendarDays } = generateCalendar()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-0 shadow-xl bg-primary text-primary-foreground">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-primary-foreground hover:bg-white/20 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("backToTasks")}
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">{t("taskDetails")}</h1>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-xl border-0 bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">{task.name}</h2>
              </div>
              <Badge
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider shadow-lg ${getPriorityClass(task.note)}`}
              >
                {task.note || "Normal"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("taskName")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">{task.name}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("jobName")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">{task.jobName}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("expectedDuration")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">
                  {task.expectedDuration
                    ? `${task.expectedDuration} hour${task.expectedDuration > 1 ? "s" : ""}`
                    : "Not specified"}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("shift")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground capitalize">{task.shift || "Not specified"}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("timing")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground capitalize">{task.timing}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("periodicity")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground capitalize">{task.periodicity}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("alertTask")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">{task.alertTask ? "Yes" : "No"}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("startDate")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">{task.startDate}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Stop className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("endDate")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">{task.endDate || "Ongoing"}</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Sync className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("interval")}
                  </div>
                </div>
                <div className="text-base font-bold text-foreground">
                  {task.interval || 1}{" "}
                  {task.periodicity === "weekly" ? "weeks" : task.periodicity === "monthly" ? "months" : "days"}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowRecurrence(!showRecurrence)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 text-lg shadow-xl transition-all duration-300"
            >
              <Calendar className="h-5 w-5 mr-3" />
              {showRecurrence ? t("hideRecurrenceSchedule") : t("viewRecurrenceSchedule")}
            </Button>

            {showRecurrence && (
              <div className="mt-8 bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800/30 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                    <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">{t("scheduledDates")}</h3>
                </div>

                <Card className="bg-white dark:bg-slate-800 shadow-xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <Button
                        variant="outline"
                        onClick={previousMonth}
                        className="hover:bg-primary hover:text-primary-foreground bg-white dark:bg-slate-700 border-2 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h4 className="text-xl font-bold text-foreground">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </h4>
                      <Button
                        variant="outline"
                        onClick={nextMonth}
                        className="hover:bg-primary hover:text-primary-foreground bg-white dark:bg-slate-700 border-2 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* periodicity summary / loading / error */}
                    <div className="mb-4">
                      {recurrenceLoading && <div className="text-sm text-muted-foreground">Loading recurrence...</div>}
                      {recurrenceError && <div className="text-sm text-destructive">{recurrenceError}</div>}
                      {!recurrenceLoading && !recurrenceError && task?.periodicityValue && (
                        <div className="text-sm text-foreground font-medium"></div>
                    //    <div>{task.periodicityValue}</div>
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {dayNames.map((day) => (
                        <div
                          key={day}
                          className="p-3 text-center font-bold text-muted-foreground bg-slate-100 dark:bg-slate-700 text-sm rounded-lg"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-6">{calendarDays}</div>

                    <div className="flex items-center justify-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-2 rounded-full shadow-md">
                        <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/40 rounded-full shadow-sm"></div>
                        <span className="text-sm font-semibold">{t("scheduledTask")}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-2 rounded-full shadow-md">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-sm"></div>
                        <span className="text-sm font-semibold">{t("today")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6 bg-white dark:bg-slate-800 border-0 shadow-xl">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <div className="p-1 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      {t("scheduleSummary")}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-l-4 border-l-primary">
                        <span className="font-semibold text-sm">{t("totalUpcomingOccurrences")}:</span>
                        <span className="font-bold text-primary">
                          {scheduledDates.filter((date) => date >= new Date()).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-l-4 border-l-primary">
                        <span className="font-semibold text-sm">{t("recurrencePattern")}:</span>
                        <span className="font-bold">
                          {task.periodicity} (every {task.interval || 1})
                        </span>
                      </div>
                      {scheduledDates.filter((date) => date >= new Date()).slice(0, 5).length > 0 && (
                        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                          <div className="font-bold mb-3">{t("nextFiveDates")}:</div>
                          <div className="space-y-2">
                            {scheduledDates
                              .filter((date) => date >= new Date())
                              .slice(0, 5)
                              .map((date, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-2 px-3 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                                >
                                  <span className="font-medium text-sm">{getTranslatedDayName(date)}</span>
                                  <span className="font-bold text-primary text-sm">{date.toLocaleDateString()}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
