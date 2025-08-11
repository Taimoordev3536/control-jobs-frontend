"use client"

import { useState, useEffect } from "react"
import {
  Clock,
  Calendar,
  User,
  MapPin,
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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"

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
  job: JobAssignment
  onBack: () => void
}

interface ApiScanHistoryResponse {
  message: string
  data: JobHistoryData[]
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
}

export function JobAttendanceDetail({ job, onBack }: JobAttendanceDetailProps) {
  const { session } = useAuth()
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
          setJobHistoryData(result.data || [])
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

    if (job.id && session?.accessToken) {
      fetchJobScanHistory()
    }
  }, [job.id, session?.accessToken])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={onBack} className="flex items-center gap-2 bg-transparent">
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
            <Button variant="outline" size="sm" onClick={onBack} className="flex items-center gap-2 bg-transparent">
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
          <Button variant="outline" size="sm" onClick={onBack} className="flex items-center gap-2 bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Attendance Details</h1>
        </div>

        {/* Time History Filters */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time History Filters</h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
              >
                {filteredJobHistory.length} of {jobHistoryData.length} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Date Range</label>
                <Select
                  value={historyFilters.dateRange}
                  onValueChange={(value) => setHistoryFilters((prev) => ({ ...prev, dateRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="lastWeek">Last Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Activity Type</label>
                <Select
                  value={historyFilters.activityType}
                  onValueChange={(value) => setHistoryFilters((prev) => ({ ...prev, activityType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="check-in">Check In</SelectItem>
                    <SelectItem value="check-out">Check Out</SelectItem>
                    <SelectItem value="break-start">Break Start</SelectItem>
                    <SelectItem value="break-end">Break End</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Worker</label>
                <Select
                  value={historyFilters.worker}
                  onValueChange={(value) => setHistoryFilters((prev) => ({ ...prev, worker: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workers</SelectItem>
                    {getUniqueWorkers().map((workerCode) => (
                      <SelectItem key={workerCode} value={workerCode}>
                        Worker {workerCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search activities..."
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time History</h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
              >
                {filteredJobHistory.length} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredJobHistory.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Data Found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {jobHistoryData.length === 0
                    ? "No attendance data available for this job yet."
                    : "No data matches your current filters. Try adjusting your search criteria."}
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
                            {dayData.scans.length + dayData.sessions.length} activities
                          </div>
                        </div>

                        {workerInfo && (
                          <div className="flex items-center text-purple-200 text-sm space-x-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {workerInfo.name}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {workerInfo.location}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary Stats */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">{totalWork}m</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Work Time
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">{totalBreaks}m</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Break Time
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">{dayData.breaks.length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Total Breaks
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Overview */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Day Overview</h4>
                            <div className="flex flex-wrap gap-2">
                              {dayOverviewScans.map((scan) => (
                                <span
                                  key={scan.id}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getActivityColor(scan.scanType)}`}
                                >
                                  {getActivityIcon(scan.scanType)}
                                  <span className="ml-1 capitalize">{scan.scanType.replace("-", " ")}</span>
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
                                Hide Details <ChevronUp className="w-4 h-4 ml-1" />
                              </>
                            ) : (
                              <>
                                View Details <ChevronDown className="w-4 h-4 ml-1" />
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
                                Work Sessions
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
                                            Work: {sessionWorkTime}m | Breaks: {session.totalBreakMinutes || 0}m
                                          </div>
                                        </div>
                                        {session.isOnBreak && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                          >
                                            On Break
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
                                Break Details
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
                                        {breakItem.durationMinutes}m
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
                              Activity Timeline
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
                                      <span className="ml-2 text-sm font-medium capitalize">
                                        {scan.scanType.replace("-", " ")}
                                      </span>
                                    </div>
                                    <span className="text-sm font-semibold">{formatTime(scan.scanTime)}</span>
                                  </div>
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
