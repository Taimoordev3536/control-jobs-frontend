"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Calendar,
  MapPin,
  Briefcase,
  Activity,
  Building,
  UserCheck,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import AddJobModal from "@/components/add-job-modal"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import JobDetailView from "@/components/job-detail-view"

interface ApiJob {
  jobId: number
  jobName: string
  clientName: string
  workCenter: string
  startDate: string
  endDate: string
  status: string
  totalShifts: number
  expectedDuration: number
  tasks: string[]
  workers: Array<{
    id: number
    code: string
    name: string | null
  }>
  attendanceRecords?: Array<{
    id: number
    checkInTime: string
    checkOutTime?: string
    date: string
  }>
  workSession?: {
    id: number
    checkInTime: string
    checkOutTime?: string
    isOnBreak: boolean
    currentBreakStart?: string
    totalWorkMinutes: number
    totalBreakMinutes: number
  } | null
}

interface ApiResponse {
  message: string
  data: ApiJob[]
  isSuccess: boolean
  statusCode: number
  developerError: string
}

interface Job {
  id: number
  title: string
  jobId: string
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
  workers: Array<{
    id: number
    name: string
    avatar?: string
  }>
  status: "scheduled" | "in_progress" | "completed"
  startDate: Date
  endDate: Date
  duration: string
  shifts: number
  occupation: string
  tags: string[]
  hasAttendanceRecord: boolean
  jobDurationDays: number
  expectedHours: number
  shift: {
    type: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    duration: string
    scheduleType: "fixed" | "flexible"
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
  totalHours?: number
  breakStartTime?: Date
  totalBreakTime: number
  isOnBreak: boolean
  signingMethods: {
    qrCode?: boolean
    gps?: boolean
    wifi?: boolean
    ip?: boolean
    callerId?: boolean
  }
}

interface Stats {
  totalJobs: number
  inProgressJobs: number
  totalWorkers: number
  completionRate: number
  avgRating: number
  totalClients: number
  pendingJobs: number
  completedJobs: number
  totalRevenue: number
  monthlyGrowth: number
}

export default function EmployerDashboard() {
  const router = useRouter()
  const { t } = useTranslation("employer-dashboard")
  const { session } = useAuth()

  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    inProgressJobs: 0,
    totalWorkers: 0,
    completionRate: 0,
    avgRating: 0,
    totalClients: 0,
    pendingJobs: 0,
    completedJobs: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [occupationFilter, setOccupationFilter] = useState("all")
  const [workCenterFilter, setWorkCenterFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [showAddJobModal, setShowAddJobModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedJobForAttendance, setSelectedJobForAttendance] = useState<Job | null>(null)
  const [selectedJobForEdit, setSelectedJobForEdit] = useState<string | null>(null)

  const occupations = [t("cleaning"), t("security"), t("maintenance"), t("delivery"), t("itSupport"), t("landscaping")]

  // Get unique work centers from jobs data
  const workCenters = Array.from(new Set(jobs.map((job) => job.workCenter.name))).filter(Boolean)

  // Format date for display
  const formatDateOnly = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = formatDateOnly(startDate)
    const end = formatDateOnly(endDate)

    // If same date, show only once
    if (start === end) {
      return start
    }

    return `${start} - ${end}`
  }

  // Transform API job data to frontend job format
  const transformApiJobToJob = (apiJob: ApiJob): Job => {
    const currentDate = new Date()

    // Parse start and end dates from API response
    const startDate = new Date(apiJob.startDate)
    const endDate = new Date(apiJob.endDate)

    // Calculate job duration in days
    const jobDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // Check if there are any attendance records (check-in + check-out pairs)
    const hasAttendanceRecord =
      Boolean(
        apiJob.attendanceRecords &&
          apiJob.attendanceRecords.length > 0 &&
          apiJob.attendanceRecords.some((record) => record.checkInTime && record.checkOutTime),
      ) || Boolean(apiJob.workSession?.checkInTime && apiJob.workSession?.checkOutTime)

    // Determine job status based on the same logic as client dashboard
    let status: "scheduled" | "in_progress" | "completed"

    if (currentDate > endDate) {
      // End date has passed
      if (hasAttendanceRecord) {
        status = "completed"
      } else {
        // End date passed but no attendance - still show as scheduled for potential late check-in
        status = "scheduled"
      }
    } else {
      // Before end date
      if (hasAttendanceRecord || apiJob.workSession?.checkInTime) {
        status = "in_progress"
      } else {
        status = "scheduled"
      }
    }

    // Infer occupation from tasks
    let occupation = t("general")
    const taskString = apiJob.tasks.join(" ").toLowerCase()
    if (taskString.includes("clean") || taskString.includes("sweep")) {
      occupation = t("cleaning")
    } else if (taskString.includes("security") || taskString.includes("guard")) {
      occupation = t("security")
    } else if (taskString.includes("maintain") || taskString.includes("repair")) {
      occupation = t("maintenance")
    } else if (taskString.includes("deliver") || taskString.includes("transport")) {
      occupation = t("delivery")
    } else if (taskString.includes("paint")) {
      occupation = t("maintenance")
    } else if (taskString.includes("garden") || taskString.includes("plant")) {
      occupation = t("landscaping")
    }

    // Create mock tasks for the job
    const mockTasks = apiJob.tasks.map((task, index) => ({
      id: index + 1,
      name: task,
      description: `Complete ${task.toLowerCase()} task`,
      completed: Math.random() > 0.5,
      duration: "2 hours",
      timing: "during" as const,
    }))

    return {
      id: apiJob.jobId,
      title: apiJob.jobName,
      jobId: `JOB-${apiJob.jobId.toString().padStart(4, "0")}`,
      client: {
        id: Math.floor(Math.random() * 100) + 1,
        name: apiJob.clientName,
      },
      workCenter: {
        id: Math.floor(Math.random() * 10) + 1,
        name: apiJob.workCenter,
        address: `${apiJob.workCenter}, Business District`,
        coordinates: { lat: 40.7128, lng: -74.006 },
      },
      workers: apiJob.workers.map((worker) => ({
        id: worker.id,
        name: worker.name || `${t("worker")} ${worker.code}`, // Fallback to code if name is null
      })),
      status,
      startDate,
      endDate,
      duration: `${jobDurationDays} ${jobDurationDays === 1 ? t("day") : t("days")}`,
      shifts: apiJob.totalShifts,
      occupation,
      tags: apiJob.tasks.slice(0, 3), // Use first 3 tasks as tags
      hasAttendanceRecord,
      jobDurationDays,
      expectedHours: apiJob.expectedDuration || 8, // Default to 8 hours if not provided
      shift: {
        type: "morning",
        startTime: "09:00",
        endTime: "17:00",
        duration: "8 hours",
        scheduleType: "fixed",
      },
      tasks: mockTasks,
      checkInTime: hasAttendanceRecord ? new Date(startDate.getTime() + 9 * 60 * 60 * 1000) : undefined,
      checkOutTime: hasAttendanceRecord ? new Date(startDate.getTime() + 17 * 60 * 60 * 1000) : undefined,
      breakTime: 30,
      workedTime: hasAttendanceRecord ? 8 * 60 : 0,
      totalBreakTime: 30,
      isOnBreak: false,
      signingMethods: {
        qrCode: true,
        gps: true,
        wifi: false,
        ip: false,
        callerId: false,
      },
    }
  }

  // Fetch jobs from API
  const fetchJobs = async () => {
    if (!session?.accessToken) {
      setError(t("unauthorized"))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/employer/all-jobs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.isSuccess && data.data) {
        const transformedJobs = data.data.map(transformApiJobToJob)
        setJobs(transformedJobs)

        // Calculate stats from real data
        const totalJobs = transformedJobs.length
        const inProgressJobs = transformedJobs.filter((job) => job.status === "in_progress").length
        const scheduledJobs = transformedJobs.filter((job) => job.status === "scheduled").length
        const completedJobs = transformedJobs.filter((job) => job.status === "completed").length
        const totalWorkers = new Set(transformedJobs.flatMap((job) => job.workers.map((w) => w.id))).size
        const uniqueClients = new Set(transformedJobs.map((job) => job.client.name)).size

        setStats({
          totalJobs,
          inProgressJobs,
          totalWorkers,
          completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
          avgRating: 4.8, // Static for now
          totalClients: uniqueClients,
          pendingJobs: scheduledJobs, // Use scheduled instead of pending
          completedJobs,
          totalRevenue: 2450000, // Static for now
          monthlyGrowth: 18.5, // Static for now
        })
      } else {
        throw new Error(data.developerError || data.message || t("failedToLoadJobs"))
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setError(error instanceof Error ? error.message : t("failedToLoadJobs"))
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [session?.accessToken])

  const handleViewAttendance = (job: Job) => {
    setSelectedJobForAttendance(job)
  }

  const handleEditJob = (jobId: number) => {
    setSelectedJobForEdit(jobId.toString())
  }

  const handleJobAdded = (newJob: any) => {
    // Refresh jobs list after adding a new job
    fetchJobs()
  }

  const handleBackFromAttendance = () => {
    setSelectedJobForAttendance(null)
  }

  const handleBackFromEdit = () => {
    setSelectedJobForEdit(null)
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    const matchesOccupation = occupationFilter === "all" || job.occupation === occupationFilter
    const matchesWorkCenter = workCenterFilter === "all" || job.workCenter.name === workCenterFilter

    return matchesSearch && matchesStatus && matchesOccupation && matchesWorkCenter
  })

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          icon: PlayCircle,
          label: t("inProgress"),
        }
      case "scheduled":
        return {
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
          icon: Clock,
          label: t("scheduled"),
        }
      case "completed":
        return {
          color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
          icon: CheckCircle,
          label: t("completed"),
        }
      default:
        return {
          color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
          icon: AlertCircle,
          label: status,
        }
    }
  }

  // Show attendance detail view
  if (selectedJobForAttendance) {
    return <JobAttendanceDetail job={selectedJobForAttendance} onBack={handleBackFromAttendance} />
  }

  // Show job edit view
  if (selectedJobForEdit) {
    return <JobDetailView jobId={selectedJobForEdit} onBack={handleBackFromEdit} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 rounded-full animate-spin border-t-purple-600"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="border border-red-200 dark:border-red-800 shadow-sm bg-white dark:bg-gray-900 max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("errorLoadingJobs")}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{error}</p>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={fetchJobs}>
              {t("tryAgain")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-width-[1800px] mx-auto p-4 space-y-4">
        {/* Compact Header */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("jobsManagement")}</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t("manageWorkforceAssignments")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t("searchJobs")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 h-9 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setShowAddJobModal(true)}
                >
                  <Plus className="w-4 h-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">{t("newJob")}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: t("totalJobs"),
              value: stats.totalJobs,
              icon: Briefcase,
            },
            {
              label: t("inProgressJobs"),
              value: stats.inProgressJobs,
              icon: Activity,
            },
            {
              label: t("scheduledJobs"),
              value: stats.pendingJobs, // This now contains scheduled jobs
              icon: Clock,
            },
            {
              label: t("completedJobs"),
              value: stats.completedJobs,
              icon: CheckCircle,
            },
            {
              label: t("totalClients"),
              value: stats.totalClients,
              icon: Building,
            },
          ].map((stat, index) => (
            <Card
              key={index}
              className="border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300 hover:scale-105 group bg-white dark:bg-gray-900"
            >
              <CardContent className="p-3">
                <div className="w-full h-0.5 bg-gray-500 rounded-full mb-2"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-gray-500 group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </div>
                  </div>
                </div>
                <div className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compact Filters */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-600 rounded-md">
                  <Filter className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("filters")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" />
                  {t("status")}
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allStatuses")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                    <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                    <SelectItem value="scheduled">{t("scheduled")}</SelectItem>
                    <SelectItem value="completed">{t("completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {t("occupation")}
                </label>
                <Select value={occupationFilter} onValueChange={setOccupationFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allOccupations")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allOccupations")}</SelectItem>
                    {occupations.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>
                        {occupation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {t("workCenter")}
                </label>
                <Select value={workCenterFilter} onValueChange={setWorkCenterFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allWorkCenters")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allWorkCenters")}</SelectItem>
                    {workCenters.map((center) => (
                      <SelectItem key={center} value={center}>
                        {center}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t("dateRange")}
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allDates")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allDates")}</SelectItem>
                    <SelectItem value="today">{t("today")}</SelectItem>
                    <SelectItem value="week">{t("thisWeek")}</SelectItem>
                    <SelectItem value="month">{t("thisMonth")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Jobs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const statusConfig = getStatusConfig(job.status)
            const StatusIcon = statusConfig.icon

            return (
              <Card
                key={job.id}
                className="group border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-white dark:bg-gray-900"
              >
                {/* Status Indicator Line */}
                <div
                  className={`w-full h-0.5 ${
                    job.status === "scheduled"
                      ? "bg-blue-500"
                      : job.status === "in_progress"
                        ? "bg-green-500"
                        : job.status === "completed"
                          ? "bg-purple-500"
                          : "bg-gray-500"
                  }`}
                ></div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs font-mono bg-gray-100 dark:bg-gray-800 h-5 border-gray-200 dark:border-gray-700"
                        >
                          {job.jobId}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`${statusConfig.color} flex items-center gap-1 h-6 text-xs`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-40 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        >
                          <DropdownMenuItem
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleViewAttendance(job)}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            {t("viewAttendance")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleEditJob(job.id)}
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            {t("editJob")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <BarChart3 className="h-3 w-3 mr-2" />
                            {t("analytics")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Client & Location Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Building className="w-3 h-3" />
                        <span className="text-xs font-medium uppercase tracking-wide">{t("client")}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {job.client.name}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs font-medium uppercase tracking-wide">{t("location")}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {job.workCenter.name}
                      </div>
                    </div>
                  </div>

                  {/* Job Duration - Single Box like Client Dashboard */}
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDateRange(job.startDate, job.endDate)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t("duration")}: {job.jobDurationDays} {job.jobDurationDays !== 1 ? t("days") : t("day")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {job.expectedHours}
                        {t("hour")}
                      </Badge>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {job.tags.slice(0, 2).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs h-5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {job.tags.length > 2 && (
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        +{job.tags.length - 2}
                      </Badge>
                    )}
                  </div>

                  {/* Workers */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {job.workers.slice(0, 3).map((worker, index) => (
                          <div
                            key={worker.id}
                            className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-bold border border-white dark:border-gray-900 shadow-sm"
                            title={worker.name}
                          >
                            {worker.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                        ))}
                        {job.workers.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs font-bold border border-white dark:border-gray-900">
                            +{job.workers.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <UserCheck className="w-3 h-3 inline mr-1" />
                        {job.workers.length}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => handleViewAttendance(job)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {t("viewAttendance")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs bg-transparent border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleEditJob(job.id)}
                    >
                      <Edit className="w-3 w-3 mr-1" />
                      {t("edit")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredJobs.length === 0 && !loading && !error && (
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("noJobsFound")}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto text-sm">
                {t("noJobsMatchFilters")}
              </p>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setOccupationFilter("all")
                  setWorkCenterFilter("all")
                  setDateFilter("all")
                }}
              >
                {t("clearAllFilters")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Compact Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            className="w-12 h-12 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group bg-purple-600 hover:bg-purple-700 text-white"
            size="icon"
            onClick={() => setShowAddJobModal(true)}
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </Button>
        </div>
      </div>

      {/* Add Job Modal */}
      <AddJobModal open={showAddJobModal} onOpenChange={setShowAddJobModal} onJobAdded={handleJobAdded} />
    </div>
  )
}
