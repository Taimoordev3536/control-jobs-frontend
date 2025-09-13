"use client"

import { useState, useEffect } from "react"
import {
  Clock,
  Calendar,
  User,
  ArrowLeft,
  Coffee,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  Timer,
  PlayCircle,
  Search,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"

interface JobAssignment {
  id: number
  jobId: string
  title: string
  client: {
    id: number
    name: string
  }
  workCenter: {
    id: number
    name: string
    address: string
    coordinates: { lat: number; lng: number }
  }
  shift: {
    type: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    duration: string
    scheduleType: "fixed" | "flexible"
  }
  status: "scheduled" | "in_progress" | "completed"
  startDate: Date
  endDate: Date
  signingMethods: {
    qrCode?: boolean
    gps?: boolean
    wifi?: boolean
    ip?: boolean
    callerId?: boolean
  }
  tasks: Array<{
    id: number
    name: string
    description: string
    completed: boolean
    duration: string
    timing: "during" | "after"
  }>
  checkInTime?: Date
  checkOutTime?: Date
  breakTime: number
  workedTime: number
  expectedHours: number
  totalHours?: number
  breakStartTime?: Date
  totalBreakTime: number
  isOnBreak: boolean
  tags: string[]
  hasAttendanceRecord: boolean
  survey?: {
    rating: number
    comments: string
    submitted: boolean
    submittedAt?: Date
  }
}

interface JobAttendanceDetailProps {
  job?: JobAssignment
  jobId?: string
  jobData?: any
  onBack?: () => void
}

interface ApiScanHistoryResponse {
  message: string
  data: JobHistoryData[]
  isSuccess: boolean
  statusCode: number
  developerError: string
}

interface ApiTaskHistoryResponse {
  message: string
  data: Array<{
    date: string
    tasks: Array<{
      id: number
      name: string
      completed: boolean
      completedByWorkerId: number
    }>
  }>
  isSuccess: boolean
  statusCode: number
  developerError: string
}

interface JobHistoryData {
  date: string
  scans: Array<{
    id: number
    scanType: string
    scanTime: string
    location: string
    notes: string
    worker: { id: number; code: string; name: string | null }
  }>
  breaks: Array<{
    breakStart: {
      id: number
      scanTime: string
      notes: string
    }
    breakEnd: {
      id: number
      scanTime: string
      notes: string
    }
    durationMinutes: number
    worker: { id: number; code: string; name: string | null }
  }>
  sessions: Array<{
    id: number
    worker: { id: number; code: string; name: string | null }
    checkInTime: string
    checkOutTime: string
    totalWorkMinutes: number
    totalBreakMinutes: number
    isOnBreak: boolean
  }>
  tasks: Array<{
    id: number
    name: string
    completed: boolean
    completedByWorkerId: number
  }>
}

export function JobAttendanceDetail({ job, jobId, jobData, onBack }: JobAttendanceDetailProps) {
  const router = useRouter()
  const { session } = useAuth()
  const { t } = useTranslation("job-attendance-detail")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [expandedHistoryCards, setExpandedHistoryCards] = useState<{ [key: string]: boolean }>({})
  const [historyFilters, setHistoryFilters] = useState({
    dateRange: "all",
    activityType: "all",
    worker: "all",
    searchTerm: "",
  })
  const [jobHistoryData, setJobHistoryData] = useState<JobHistoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskHistoryByDate, setTaskHistoryByDate] = useState<Record<string, { id: number; name: string; completed: boolean; completedByWorkerId: number }[]>>({})

  // Handle back button click with fallback to router.back()
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  // Fetch job scan history from API
  useEffect(() => {
    const fetchJobScanHistory = async () => {
      if (!session?.accessToken) {
        setError("No authentication token available")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Use the same pattern as employer dashboard - direct API call with session token
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${job.id}/scan-history`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Please log in again.")
          }
          if (response.status === 404) {
            throw new Error("Job scan history endpoint not found. Please check the job ID.")
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: ApiScanHistoryResponse = await response.json()

        if (result.isSuccess) {
          // Regroup by viewer timezone on the client to avoid UTC day shifts
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

          const dateKeyInTz = (date: string | Date) => {
            const d = typeof date === 'string' ? new Date(date) : date
            const parts = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).formatToParts(d)
            const y = parts.find(p => p.type === 'year')!.value
            const m = parts.find(p => p.type === 'month')!.value
            const da = parts.find(p => p.type === 'day')!.value
            return `${y}-${m}-${da}`
          }

          // Flatten scans and sessions coming from server (which may be UTC-grouped)
          const allScans: any[] = []
          const allSessions: any[] = []
          for (const day of result.data || []) {
            for (const s of day.scans || []) allScans.push(s)
            for (const sess of day.sessions || []) allSessions.push(sess)
          }

          // Group scans by local day
          const scansByDate: Record<string, any[]> = {}
          for (const s of allScans) {
            const key = dateKeyInTz(s.scanTime)
            if (!scansByDate[key]) scansByDate[key] = []
            scansByDate[key].push(s)
          }

          // Group sessions by local day (based on check-in time)
          const sessionsByDate: Record<string, any[]> = {}
          for (const sess of allSessions) {
            const key = dateKeyInTz(sess.checkInTime)
            if (!sessionsByDate[key]) sessionsByDate[key] = []
            sessionsByDate[key].push(sess)
          }

          // Recompute breaks per local day by pairing break-start -> break-end in chronological order
          const breaksByDate: Record<string, any[]> = {}
          for (const [dateKey, scans] of Object.entries(scansByDate)) {
            const sorted = [...scans].sort((a, b) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime())
            const dayBreaks: any[] = []
            let currentStart: any | null = null
            for (const log of sorted) {
              if (log.scanType === 'break-start') {
                currentStart = log
              } else if (log.scanType === 'break-end' && currentStart) {
                const durationMinutes = Math.floor((new Date(log.scanTime).getTime() - new Date(currentStart.scanTime).getTime()) / (1000 * 60))
                dayBreaks.push({
                  breakStart: { id: currentStart.id, scanTime: currentStart.scanTime, notes: currentStart.notes },
                  breakEnd: { id: log.id, scanTime: log.scanTime, notes: log.notes },
                  durationMinutes,
                  worker: log.worker,
                })
                currentStart = null
              }
            }
            breaksByDate[dateKey] = dayBreaks
          }

          // Build tasksByDate from API response so we don't lose dates that only have tasks
          const tasksByDate: Record<string, any[]> = {}
          for (const d of result.data || []) {
            if (d.tasks && Array.isArray(d.tasks)) {
              tasksByDate[d.date] = d.tasks
            }
          }

          // Build final localized daily cards using all dates (scans, sessions, tasks)
          const allDatesSet = new Set<string>([
            ...Object.keys(scansByDate),
            ...Object.keys(sessionsByDate),
            ...Object.keys(tasksByDate),
          ])

          const localizedData: JobHistoryData[] = Array.from(allDatesSet)
            .sort() // ascending by date string YYYY-MM-DD
            .map(date => ({
              date,
              scans: scansByDate[date] || [],
              breaks: breaksByDate[date] || [],
              sessions: sessionsByDate[date] || [],
              tasks: tasksByDate[date] || [],
            }))

          setJobHistoryData(localizedData)

          // Build task map for fast lookup in UI — use API result directly to avoid missing dates
          const taskMap: Record<string, { id: number; name: string; completed: boolean; completedByWorkerId: number }[]> = {}
          for (const d of result.data || []) {
            if (d.tasks && Array.isArray(d.tasks)) {
              taskMap[d.date] = d.tasks
            }
          }
          setTaskHistoryByDate(taskMap)
        } else {
          throw new Error(result.developerError || result.message || "Failed to fetch job scan history")
        }
      } catch (err) {
        console.error("Error fetching job scan history:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch job scan history")
        // Fallback to empty data
        setJobHistoryData([])
      } finally {
        setLoading(false)
      }
    }

    if (job?.id && session?.accessToken) {
      fetchJobScanHistory()
    } else if (jobId && session?.accessToken) {
      // Use jobId from props if job object is not available
      const fetchJobScanHistoryById = async () => {
        try {
          setLoading(true)
          setError(null)
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}/scan-history`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          })
          
          // Rest of fetch logic remains the same
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Authentication failed. Please log in again.")
            }
            if (response.status === 404) {
              throw new Error("Job scan history endpoint not found. Please check the job ID.")
            }
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const result: ApiScanHistoryResponse = await response.json()
          // Process result same as in fetchJobScanHistory
          if (result.isSuccess) {
            setJobHistoryData(result.data || [])
            // populate taskHistoryByDate for this simpler branch as well
            const taskMap: Record<string, { id: number; name: string; completed: boolean; completedByWorkerId: number }[]> = {}
            for (const d of result.data || []) {
              if (d.tasks && Array.isArray(d.tasks)) {
                taskMap[d.date] = d.tasks
              }
            }
            setTaskHistoryByDate(taskMap)
          } else {
            throw new Error(result.developerError || result.message || "Failed to fetch job scan history")
          }
        } catch (err) {
          console.error("Error fetching job scan history:", err)
          setError(err instanceof Error ? err.message : "Failed to fetch job scan history")
          setJobHistoryData([])
        } finally {
          setLoading(false)
        }
      }
      
      fetchJobScanHistoryById()
    }
  }, [job?.id, jobId, session?.accessToken])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleHistoryCard = (date: string) => {
    setExpandedHistoryCards((prev) => ({
      ...prev,
      [date]: !prev[date],
    }))
  }

  const formatDate = (dateString: string) => {
    // Create date object and ensure it's interpreted in local timezone
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getActivityIcon = (scanType: string) => {
    switch (scanType) {
      case "check-in":
        return <LogIn className="w-4 h-4 text-green-500" />
      case "check-out":
        return <LogOut className="w-4 h-4 text-red-500" />
      case "break-start":
        return <Coffee className="w-4 h-4 text-orange-500" />
      case "break-end":
        return <PlayCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
    }
  }

  const getActivityColor = (scanType: string) => {
    switch (scanType) {
      case "check-in":
        return "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
      case "check-out":
        return "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
      case "break-start":
        return "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400"
      case "break-end":
        return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
    }
  }

  const calculateDayTotals = (dayData: JobHistoryData) => {
    let totalWork = 0
    let totalBreaks = 0

    // First, try to get totals from sessions if available
    dayData.sessions.forEach((session) => {
      if (session.totalWorkMinutes && session.totalWorkMinutes > 0) {
        totalWork += session.totalWorkMinutes
      }
      if (session.totalBreakMinutes && session.totalBreakMinutes > 0) {
        totalBreaks += session.totalBreakMinutes
      }
    })

    // Add break time from breaks array
    dayData.breaks.forEach((breakItem) => {
      totalBreaks += breakItem.durationMinutes || 0
    })

    // If we don't have work time from sessions, calculate it manually
    if (totalWork === 0) {
      // Find check-in and check-out scans
      const checkInScan = dayData.scans.find((scan) => scan.scanType === "check-in")
      const checkOutScan = dayData.scans.find((scan) => scan.scanType === "check-out")

      if (checkInScan && checkOutScan) {
        const checkInTime = new Date(checkInScan.scanTime)
        const checkOutTime = new Date(checkOutScan.scanTime)

        // Calculate total time between check-in and check-out in minutes
        const totalMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))

        // Subtract break time to get actual work time
        totalWork = Math.max(0, totalMinutes - totalBreaks)
      }

      // If we still don't have work time, try from sessions check-in/check-out times
      if (totalWork === 0) {
        dayData.sessions.forEach((session) => {
          if (session.checkInTime && session.checkOutTime) {
            const checkInTime = new Date(session.checkInTime)
            const checkOutTime = new Date(session.checkOutTime)
            const sessionMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))
            const sessionBreaks = session.totalBreakMinutes || 0
            totalWork += Math.max(0, sessionMinutes - sessionBreaks)
          }
        })
      }
    }

    return { totalWork, totalBreaks }
  }

  const getWorkerInfo = (dayData: JobHistoryData) => {
    const worker = dayData.scans[0]?.worker || dayData.sessions[0]?.worker
    return worker
      ? {
          name: worker.name || `Worker ${worker.code}`,
          code: worker.code,
          location: dayData.scans[0]?.location || "Main Office",
        }
      : null
  }

  const getDayOverviewScans = (dayData: JobHistoryData) => {
    // Get both check-in and check-out scans, sorted by time
    const checkScans = dayData.scans
      .filter((scan) => scan.scanType === "check-in" || scan.scanType === "check-out")
      .sort((a, b) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime())

    return checkScans
  }

  // Filter job history data based on filters
  const getFilteredJobHistory = () => {
    let filtered = [...jobHistoryData]

    // Date range filter
    if (historyFilters.dateRange !== "all") {
      const today = new Date()
      // Get today's date in YYYY-MM-DD format in local timezone
      const todayStr =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0")

      switch (historyFilters.dateRange) {
        case "today":
          filtered = filtered.filter((dayData) => dayData.date === todayStr)
          break
        case "yesterday":
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr =
            yesterday.getFullYear() +
            "-" +
            String(yesterday.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(yesterday.getDate()).padStart(2, "0")
          filtered = filtered.filter((dayData) => dayData.date === yesterdayStr)
          break
        case "thisWeek":
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          filtered = filtered.filter((dayData) => {
            const dataDate = new Date(dayData.date + "T00:00:00")
            return dataDate >= weekAgo
          })
          break
        case "lastWeek":
          const twoWeeksAgo = new Date(today)
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
          const oneWeekAgo = new Date(today)
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          filtered = filtered.filter((dayData) => {
            const dataDate = new Date(dayData.date + "T00:00:00")
            return dataDate >= twoWeeksAgo && dataDate < oneWeekAgo
          })
          break
        case "thisMonth":
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          filtered = filtered.filter((dayData) => {
            const dataDate = new Date(dayData.date + "T00:00:00")
            return dataDate >= monthAgo
          })
          break
      }
    }

    // Activity type filter
    if (historyFilters.activityType !== "all") {
      filtered = filtered.filter((dayData) =>
        dayData.scans.some((scan) => scan.scanType === historyFilters.activityType),
      )
    }

    // Worker filter
    if (historyFilters.worker !== "all") {
      filtered = filtered.filter(
        (dayData) =>
          dayData.scans.some((scan) => scan.worker.code === historyFilters.worker) ||
          dayData.sessions.some((session) => session.worker.code === historyFilters.worker),
      )
    }

    // Search filter
    if (historyFilters.searchTerm) {
      const searchTerm = historyFilters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (dayData) =>
          dayData.date.includes(searchTerm) ||
          dayData.scans.some(
            (scan) =>
              scan.notes.toLowerCase().includes(searchTerm) ||
              scan.location.toLowerCase().includes(searchTerm) ||
              scan.scanType.toLowerCase().includes(searchTerm),
          ),
      )
    }

    return filtered
  }

  const filteredJobHistory = getFilteredJobHistory()

  // Get unique workers for filter dropdown
  const getUniqueWorkers = () => {
    const workers = new Set<string>()
    jobHistoryData.forEach((dayData) => {
      dayData.scans.forEach((scan) => workers.add(scan.worker.code))
      dayData.sessions.forEach((session) => workers.add(session.worker.code))
    })
    return Array.from(workers)
  }

  // Retry function
  const handleRetry = () => {
    if (job.id && session?.accessToken) {
      setError(null)
      setLoading(true)
      // Re-trigger the useEffect by updating a dependency
      window.location.reload()
    }
  }

  const getActivityName = (scanType: string) => {
    switch (scanType) {
      case "check-in":
        return t("checkIn")
      case "check-out":
        return t("checkOut")
      case "break-start":
        return t("breakStart")
      case "break-end":
        return t("breakEnd")
      default:
        return scanType.replace("-", " ")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={handleBack} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Attendance Details</h1>
          </div>

          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="text-gray-600 dark:text-gray-400">Loading job attendance data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={handleBack} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Attendance Details</h1>
          </div>

          <Card className="border border-red-200 dark:border-red-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Data</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Try Again
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Job ID: {job.id} | API URL: {process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/{job.id}/scan-history
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={handleBack} className="flex items-center gap-2 bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            {t("backToDashboard")}
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("jobAttendanceDetails")}</h1>
        </div>

        {/* Time History Filters */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("timeHistoryFilters")}</h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
              >
                {filteredJobHistory.length} {t("of")} {jobHistoryData.length} {t("days")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  {t("dateRange")}
                </label>
                <Select
                  value={historyFilters.dateRange}
                  onValueChange={(value) => setHistoryFilters((prev) => ({ ...prev, dateRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allDates")}</SelectItem>
                    <SelectItem value="today">{t("today")}</SelectItem>
                    <SelectItem value="yesterday">{t("yesterday")}</SelectItem>
                    <SelectItem value="thisWeek">{t("thisWeek")}</SelectItem>
                    <SelectItem value="lastWeek">{t("lastWeek")}</SelectItem>
                    <SelectItem value="thisMonth">{t("thisMonth")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  {t("activityType")}
                </label>
                <Select
                  value={historyFilters.activityType}
                  onValueChange={(value) => setHistoryFilters((prev) => ({ ...prev, activityType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allActivities")}</SelectItem>
                    <SelectItem value="check-in">{t("checkIn")}</SelectItem>
                    <SelectItem value="check-out">{t("checkOut")}</SelectItem>
                    <SelectItem value="break-start">{t("breakStart")}</SelectItem>
                    <SelectItem value="break-end">{t("breakEnd")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t("worker")}</label>
                <Select
                  value={historyFilters.worker}
                  onValueChange={(value) => setHistoryFilters((prev) => ({ ...prev, worker: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allWorkers")}</SelectItem>
                    {getUniqueWorkers().map((workerCode) => (
                      <SelectItem key={workerCode} value={workerCode}>
                        {t("workerCode", { code: workerCode })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t("search")}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t("searchActivities")}
                    value={historyFilters.searchTerm}
                    onChange={(e) => setHistoryFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time History */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Timer className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("timeHistory")}</h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
              >
                {filteredJobHistory.length} {t("days")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredJobHistory.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("noDataFound")}</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {jobHistoryData.length === 0 ? t("noAttendanceData") : t("noDataMatchesFilters")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobHistory.map((dayData) => {
                  const { totalWork, totalBreaks } = calculateDayTotals(dayData)
                  const workerInfo = getWorkerInfo(dayData)
                  const isExpanded = expandedHistoryCards[dayData.date]
                  const dayOverviewScans = getDayOverviewScans(dayData)

                  return (
                    <div
                      key={dayData.date}
                      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
                    >
                      {/* Header */}
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Calendar className="w-5 h-5 mr-2" />
                            <h3 className="text-lg font-semibold">{formatDate(dayData.date)}</h3>
                          </div>
                          <div className="flex items-center text-sm bg-white/20 px-2 py-1 rounded-full">
                            <Clock className="w-4 h-4 mr-1" />
                            {dayData.scans.length + dayData.sessions.length} {t("activities")}
                          </div>
                        </div>

                        {workerInfo && (
                          <div className="flex items-center text-purple-200 text-sm space-x-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {workerInfo.name}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary Stats */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {totalWork}
                              {t("minutes")}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("workTime")}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                              {totalBreaks}
                              {t("minutes")}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("breakTime")}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">{dayData.breaks.length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("totalBreaks")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Daily Tasks Section (real task history) */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t("dailyTasks")}</h4>
                        <div className="flex flex-wrap gap-2">
                          {(taskHistoryByDate[dayData.date] || []).map((task) => (
                            <span
                              key={`${dayData.date}-${task.id}`}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                task.completed
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
                              }`}
                            >
                              {task.completed ? (
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                              {task.name}
                            </span>
                          ))}
                          {!(taskHistoryByDate[dayData.date]?.length) && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t("noTasksForThisDay")}</span>
                          )}
                        </div>
                      </div>

                      {/* Quick Overview */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              {t("dayOverview")}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {dayOverviewScans.map((scan) => (
                                <span
                                  key={scan.id}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getActivityColor(scan.scanType)}`}
                                >
                                  {getActivityIcon(scan.scanType)}
                                  <span className="ml-1">{getActivityName(scan.scanType)}</span>
                                  <span className="ml-1">{formatTime(scan.scanTime)}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          <Button
                            onClick={() => toggleHistoryCard(dayData.date)}
                            variant="ghost"
                            size="sm"
                            className="ml-4 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            {isExpanded ? (
                              <>
                                {t("hideDetails")} <ChevronUp className="w-4 h-4 ml-1" />
                              </>
                            ) : (
                              <>
                                {t("viewDetails")} <ChevronDown className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-gray-50 dark:bg-gray-800/30">
                          {/* Sessions */}
                          {dayData.sessions.length > 0 && (
                            <div className="mb-4 pt-4">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                <Timer className="w-4 h-4 mr-1" />
                                {t("workSessions")}
                              </h5>
                              <div className="space-y-2">
                                {dayData.sessions.map((session) => {
                                  // Calculate work time for this session
                                  let sessionWorkTime = session.totalWorkMinutes || 0
                                  if (sessionWorkTime === 0 && session.checkInTime && session.checkOutTime) {
                                    const checkInTime = new Date(session.checkInTime)
                                    const checkOutTime = new Date(session.checkOutTime)
                                    const totalMinutes = Math.floor(
                                      (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60),
                                    )
                                    const sessionBreaks = session.totalBreakMinutes || 0
                                    sessionWorkTime = Math.max(0, totalMinutes - sessionBreaks)
                                  }

                                  return (
                                    <div
                                      key={session.id}
                                      className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatTime(session.checkInTime)} - {formatTime(session.checkOutTime)}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t("work")}: {sessionWorkTime}
                                            {t("minutes")} | {t("breaks")}: {session.totalBreakMinutes || 0}
                                            {t("minutes")}
                                          </div>
                                        </div>
                                        {session.isOnBreak && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                          >
                                            {t("onBreak")}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Break Details */}
                          {dayData.breaks.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                <Coffee className="w-4 h-4 mr-1" />
                                {t("breakDetails")}
                              </h5>
                              <div className="space-y-2">
                                {dayData.breaks.map((breakItem, index) => (
                                  <div
                                    key={index}
                                    className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-orange-200 dark:border-orange-800"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {formatTime(breakItem.breakStart.scanTime)} -{" "}
                                          {formatTime(breakItem.breakEnd.scanTime)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {breakItem.breakStart.notes}
                                        </div>
                                      </div>
                                      <div className="text-sm font-semibold text-orange-600">
                                        {breakItem.durationMinutes}
                                        {t("minutes")}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Scans Timeline */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {t("activityTimeline")}
                            </h5>
                            <div className="space-y-2">
                              {dayData.scans.map((scan) => (
                                <div
                                  key={scan.id}
                                  className={`p-3 rounded-lg border ${getActivityColor(scan.scanType)} bg-white dark:bg-gray-900`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      {getActivityIcon(scan.scanType)}
                                      <span className="ml-2 text-sm font-medium">{getActivityName(scan.scanType)}</span>
                                    </div>
                                    <span className="text-sm font-semibold">{formatTime(scan.scanTime)}</span>
                                  </div>
                                  {scan.location && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-6">
                                      {(() => {
                                        try {
                                          const locationData = JSON.parse(scan.location)
                                          return (
                                            <>
                                              {locationData.address && (
                                                <p>
                                                  <strong>{t("address")}:</strong> {locationData.address}
                                                </p>
                                              )}
                                              {locationData.ip && (
                                                <p>
                                                  <strong>{t("ip")}:</strong> {locationData.ip}
                                                </p>
                                              )}
                                              {locationData.latitude && locationData.longitude && (
                                                <p>
                                                  <strong>{t("gps")}:</strong> {locationData.latitude},{" "}
                                                  {locationData.longitude}
                                                </p>
                                              )}
                                              {locationData.qrData && (
                                                <p>
                                                  <strong>{t("qrData")}:</strong> {locationData.qrData}
                                                </p>
                                              )}
                                            </>
                                          )
                                        } catch (e) {
                                          // If not JSON, display as regular text
                                          return <p>{scan.location}</p>
                                        }
                                      })()}
                                    </div>
                                  )}
                                  {scan.notes && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-6">{scan.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Add default export to fix Next.js dynamic import error
export default JobAttendanceDetail
