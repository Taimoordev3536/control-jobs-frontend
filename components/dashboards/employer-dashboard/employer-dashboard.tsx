"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Calendar,
  Briefcase,
  Activity,
  Building,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"
// import AddJobModal from "@/components/add-job-modal"
import AddJobModal from "@/components/add-job-modal/main"
import JobDetail from "@/components/job-detail/job-detail"
import { EmployerJobCard } from "./employer-job-card"

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
  // optional linkage fields from API
  clientId?: number | null
  employerName?: string
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
  expectedHours?: number
  // new schedule fields
  scheduleType?: string // 'free' | 'fixed' | 'summer' | 'normal' | 'seasonal'
  activeScheduleWeekHours?: number | null
  // keep raw expectedDuration for legacy consumer components
  expectedDuration?: number | null
  shift: {
    type: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    duration: string
    scheduleType: string
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
  // derived lists for UI: split by device type
  signingMobile?: string[]
  signingPc?: string[]
  // new backend fields
  hasClientSurvey?: boolean
  hasWorkerSurvey?: boolean
  workCenters?: Array<{ id?: number; name?: string }>
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
  const { session, logout } = useAuth()

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
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<string | null>(null)

  const occupations = [t("cleaning"), t("security"), t("maintenance"), t("delivery"), t("itSupport"), t("landscaping")]

  // Get unique work centers from jobs data (support workCenter or workCenters)
  const workCenters = Array.from(
    new Set(
      jobs.map((job) => job.workCenter?.name || (job as any).workCenters?.[0]?.name || (job as any).workCenterNames || "")
    )
  ).filter(Boolean)

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

  // Transform API job data (new backend shape) to frontend job format
  // Accept a flexible shape because backend now returns richer objects
  const transformApiJobToJob = (apiJob: any): Job => {
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
      apiJob.attendanceRecords.some((record: any) => record.checkInTime && record.checkOutTime),
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
  // tasks may be strings or objects { name }
  const rawTaskNames = (apiJob.tasks || []).map((t: any) => (typeof t === 'string' ? t : t?.name || '') )
  const taskString = rawTaskNames.join(" ").toLowerCase()
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

    // Create mock tasks for the job (preserve id/name when available)
    const mockTasks = (apiJob.tasks || []).map((task: any, index: number) => {
      const name = typeof task === 'string' ? task : task?.name || `Task ${index + 1}`
      return {
        id: task?.id || index + 1,
        name,
        description: `Complete ${String(name).toLowerCase()} task`,
        completed: task?.completed ?? false,
        duration: "2 hours",
        timing: "during" as const,
      }
    })

    // Normalize backend scheduleType (may be free | fixed | summer | normal | seasonal)
    const backendScheduleTypeRaw = (apiJob.scheduleType || '').toString().toLowerCase()
    const backendScheduleType = ['free','fixed','summer','normal','seasonal'].includes(backendScheduleTypeRaw)
      ? backendScheduleTypeRaw
      : (backendScheduleTypeRaw === 'programming' ? 'fixed' : backendScheduleTypeRaw || 'free')

    // Determine expected hours for card display
    let expectedHours: number | undefined = undefined
    if (backendScheduleType === 'free') {
      expectedHours = undefined
    } else if (backendScheduleType === 'fixed') {
      expectedHours = apiJob.expectedDuration ?? apiJob.expectedHours ?? 0
    } else if (['summer','normal','seasonal'].includes(backendScheduleType)) {
      // Prefer activeScheduleWeekHours from backend seasonal logic
      expectedHours = apiJob.activeScheduleWeekHours ?? apiJob.expectedDuration ?? apiJob.expectedHours ?? 0
    } else {
      expectedHours = apiJob.expectedDuration ?? apiJob.expectedHours ?? 0
    }

    // Prefer explicit ids/names if backend provided them
    const clientId = (apiJob as any).clientId ?? (apiJob as any)?.client?.id ?? null
    const employerName = (apiJob as any).employerName ?? (apiJob as any)?.employer?.name ?? (session as any)?.user?.name ?? ''

    return {
      id: apiJob.jobId,
      title: apiJob.jobName,
      jobId: `JOB-${apiJob.jobId.toString().padStart(4, "0")}`,
      client: {
        // keep a numeric id; fall back to a placeholder when missing
        id: typeof clientId === 'number' ? clientId : 0,
        name: apiJob.clientName || apiJob.client?.name || '',
      },
      // expose linkage fields for UI decisions
      clientId: clientId,
      employerName,
      // Frontend expects a single workCenter object; derive from new `workCenters` array if present
      workCenter: {
        id: apiJob.jobId,
        name: (apiJob.workCenters && apiJob.workCenters.length > 0)
          ? apiJob.workCenters[0].name
          : (apiJob.workCenter || apiJob.workCenterNames || ''),
        address: `${(apiJob.workCenters && apiJob.workCenters.length > 0) ? apiJob.workCenters[0].name : (apiJob.workCenter || '')}, Business District`,
        coordinates: { lat: 40.7128, lng: -74.006 },
      },
      workers: (apiJob.workers || []).map((worker: any) => ({
        id: worker.id,
        name: worker.name || `${t("worker")} ${worker.code}`, // Fallback to code if name is null
      })),
      status,
      startDate,
      endDate,
      duration: `${jobDurationDays} ${jobDurationDays === 1 ? t("day") : t("days")}`,
      shifts: apiJob.totalShifts,
      occupation,
      tags: rawTaskNames.slice(0, 3), // Use first 3 tasks as tags
      hasAttendanceRecord,
      jobDurationDays,
      // expose both expectedDuration (raw from API) and expectedHours (frontend-friendly)
      expectedDuration: apiJob.expectedDuration ?? apiJob.expectedHours ?? null,
      expectedHours,
      scheduleType: backendScheduleType,
      activeScheduleWeekHours: apiJob.activeScheduleWeekHours ?? null,
      shift: {
        type: "morning",
        startTime: "09:00",
        endTime: "17:00",
        duration: "8 hours",
        scheduleType: backendScheduleType,
      },
      tasks: mockTasks,
      // expose new fields so components can use them (normalize signingMethods into boolean flags)
      hasClientSurvey: !!apiJob.hasClientSurvey,
      hasWorkerSurvey: !!apiJob.hasWorkerSurvey,
      workCenters: apiJob.workCenters || [],
      signingMethods: (() => {
        const s = { qrCode: false, gps: false, wifi: false, ip: false, callerId: false }
        ;(apiJob.signingMethods || []).forEach((m: any) => {
          const details = (m.methodDetails || m.details || [])
          if (Array.isArray(details)) {
            details.forEach((d: any) => {
              const dv = String(d || '').toLowerCase()
              if (dv.includes('qr')) s.qrCode = true
              if (dv.includes('gps')) s.gps = true
              if (dv.includes('wifi') || dv.includes('web')) s.wifi = true
              if (dv.includes('ip')) s.ip = true
            })
          }
        })
        return s
      })(),
      // split methods into mobile vs pc lists for UI rendering
      signingMobile: (() => {
        const list: string[] = []
        ;(apiJob.signingMethods || []).forEach((m: any) => {
          const type = String(m?.methodType || m?.type || '').toLowerCase()
          if (!type.includes('mobile')) return
          const details = (m.methodDetails || m.details || [])
          ;(Array.isArray(details) ? details : [details]).forEach((d: any) => {
            const s = String(d || '').toLowerCase()
            if (s.includes('qr')) list.push('qrcode')
            else if (s.includes('gps')) list.push('gps')
            else if (s.includes('ip')) list.push('ip')
            else if (s.includes('web') || s.includes('wifi')) list.push('web')
          })
        })
        return Array.from(new Set(list.filter((v) => ['qrcode','gps','ip','web'].includes(v))))
      })(),
      signingPc: (() => {
        const list: string[] = []
        ;(apiJob.signingMethods || []).forEach((m: any) => {
          const type = String(m?.methodType || m?.type || '').toLowerCase()
          if (!(type.includes('pc') || type.includes('laptop') || type.includes('web'))) return
          const details = (m.methodDetails || m.details || [])
          ;(Array.isArray(details) ? details : [details]).forEach((d: any) => {
            const s = String(d || '').toLowerCase()
            if (s.includes('ip')) list.push('ip')
            else if (s.includes('web') || s.includes('wifi')) list.push('web')
            // ignore qr/gps for PC per spec
          })
        })
        return Array.from(new Set(list.filter((v) => ['web','ip'].includes(v))))
      })(),
      checkInTime: hasAttendanceRecord ? new Date(startDate.getTime() + 9 * 60 * 60 * 1000) : undefined,
      checkOutTime: hasAttendanceRecord ? new Date(startDate.getTime() + 17 * 60 * 60 * 1000) : undefined,
      breakTime: 30,
      workedTime: hasAttendanceRecord ? 8 * 60 : 0,
      totalBreakTime: 30,
      isOnBreak: false,
      // legacy default signingMethods object retained for compatibility (already set above)
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
        if (response.status === 401) {
          logout()
          return
        }
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

  const handleViewDetails = (job: Job) => {
    setSelectedJobForDetail(job.id.toString())
  }

  const handleEditJob = (jobId: number) => {
    setSelectedJobForDetail(jobId.toString())
  }

  const handleJobAdded = (newJob: any) => {
    // Refresh jobs list after adding a new job
    fetchJobs()
  }

  const handleBackFromDetail = () => {
    setSelectedJobForDetail(null)
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.client?.name || (job as any).clientName || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    const matchesOccupation = occupationFilter === "all" || job.occupation === occupationFilter
    const jobWorkCenterName = job.workCenter?.name || (job as any).workCenters?.[0]?.name || (job as any).workCenterNames || ""
    const matchesWorkCenter = workCenterFilter === "all" || jobWorkCenterName === workCenterFilter

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

  // Show unified JobDetail component
  if (selectedJobForDetail) {
    return <JobDetail jobId={selectedJobForDetail} onClose={handleBackFromDetail} />
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border border-red-200 dark:border-red-800 shadow-sm bg-card max-w-md">
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
    <div className="min-h-screen bg-background">
      <div className="max-width-[1800px] mx-auto p-4 space-y-4">
        {/* Compact Header */}
        <Card className="border border-border shadow-sm bg-card">
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
                    className="pl-9 w-64 h-9 border-border bg-card"
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
              className="border border-border hover:shadow-md transition-all duration-300 hover:scale-105 group bg-card"
            >
              <CardContent className="p-3">
                <div className="w-full h-0.5 bg-[#6B7280] rounded-full mb-2"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[#6B7280] group-hover:scale-110 transition-transform duration-300">
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
        <Card className="border border-border shadow-sm bg-card">
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
                  <SelectTrigger className="h-8 text-xs border-border bg-card">
                    <SelectValue placeholder={t("allStatuses")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
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
                  <SelectTrigger className="h-8 text-xs border-border bg-card">
                    <SelectValue placeholder={t("allOccupations")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
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
                  <SelectTrigger className="h-8 text-xs border-border bg-card">
                    <SelectValue placeholder={t("allWorkCenters")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
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
                  <SelectTrigger className="h-8 text-xs border-border bg-card">
                    <SelectValue placeholder={t("allDates")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
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

        <Card className="border border-border shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJobs.map((job) => (
                <EmployerJobCard
                  key={job.id}
                  job={job as any}
                  onViewDetails={(j: any) => handleViewDetails(j as any)}
                  onEdit={handleEditJob}
                  onViewRecords={(j: any) => handleViewDetails(j as any)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {filteredJobs.length === 0 && !loading && !error && (
          <Card className="border border-border shadow-sm bg-card">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
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

      {/* Add Job Modal viewAttendance  */}
      <AddJobModal open={showAddJobModal} onOpenChange={setShowAddJobModal} onJobAdded={handleJobAdded} />
    </div>
  )
}
