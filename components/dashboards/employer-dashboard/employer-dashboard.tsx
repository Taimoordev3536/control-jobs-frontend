"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { acquireSocket, releaseSocket } from "@/lib/socket"
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
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"
// import AddJobModal from "@/components/add-job-modal"
import AddJobModal from "@/components/add-job-modal/main"
import JobDetail from "@/components/job-detail/job-detail"
import { EmployerJobCard } from "./employer-job-card"
import ManualAttendanceRequestForm from "@/components/manual-attendance/manual-attendance-request-form"
import { PaymentMethodModal } from "@/components/payment-method-modal"
import { AttentionCard, ActionButton, SectionLabel, JobFilterBar, jobMatchesFilters, jobWorkCenters, jobClients, jobWorkers, jobOccupations } from "../dashboard-widgets"
import JobsIcon from "../../../icons/Menu/Jobs.svg"
import InvoicesIcon from "../../../icons/Menu/invoices.svg"
import InviteIcon from "../../../icons/Menu/Invite.svg"
import ClientMenuIcon from "../../../icons/Menu/clients.svg"
import WorkersMenuIcon from "../../../icons/Menu/workers.svg"
import ConsultIcon from "../../../icons/new/consultas.svg"
import SalaryIcon from "../../../icons/new/salaries.svg"

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
  publicId?: string
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
  const { t: tg, language, tEnum } = useTranslation()
  const { session, logout, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [occupationFilter, setOccupationFilter] = useState("all")
  const [workCenterFilter, setWorkCenterFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [showAddJobModal, setShowAddJobModal] = useState(false)
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<string | null>(null)
  const [manualAttendanceJob, setManualAttendanceJob] = useState<any>(null)
  const [showManualAttendanceForm, setShowManualAttendanceForm] = useState(false)
  // Trial-end / payment-method banner state comes from the ["employers","me"]
  // query below; the modal's `onSaved` patches that cache entry so the banner
  // clears immediately without another round-trip.
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)
  const [jobsTab, setJobsTab] = useState<"today" | "live" | "all">("today")
  const [clientFilter, setClientFilter] = useState("all")
  const [workerFilter, setWorkerFilter] = useState("all")

  // /employers/me is shared with other screens via this key; the billing
  // preview genuinely depends on the employerId it returns, so it stays
  // chained (enabled on employerId) rather than parallel.
  const { data: me } = useQuery({
    queryKey: ["employers", "me"],
    queryFn: async () => (await apiFetch<{ data: any }>("/employers/me"))?.data ?? null,
    enabled: isAuthenticated,
  })
  const employerId = me?.id ?? null
  const billingStatus: string | null = me?.billingStatus ?? null
  const currentPaymentMethodId: number | null = me?.paymentMethodId ?? null

  const { data: pendingRateChange = null } = useQuery({
    queryKey: ["billing", "preview", employerId],
    queryFn: async () => {
      const json = await apiFetch<{ data: any }>("/billing/preview", {
        method: "POST",
        body: JSON.stringify({ employerId }),
      })
      return json?.data?.pendingChange ?? null
    },
    enabled: isAuthenticated && !!employerId,
  })

  const occupations = [t("cleaning"), t("security"), t("maintenance"), t("delivery"), t("itSupport"), t("landscaping")]

  // Format date for display
  const formatDateOnly = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: DEFAULT_TIMEZONE,
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
      publicId: apiJob.publicId,
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
        id: worker.publicId || worker.id,
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

  // Shares the ["jobs","employer-all"] key with the /jobs/all page, so
  // moving between dashboard and jobs list is served from one cache entry.
  const {
    data: jobs = [],
    isLoading: loading,
    error: jobsError,
    refetch: fetchJobs,
  } = useQuery({
    queryKey: ["jobs", "employer-all"],
    queryFn: async () => {
      const data = await apiFetch<ApiResponse>("/jobs/employer/all-jobs")
      if (!data?.isSuccess || !data.data) {
        throw new Error(data?.developerError || data?.message || t("failedToLoadJobs"))
      }
      return data.data.map(transformApiJobToJob)
    },
    enabled: isAuthenticated,
  })
  const error = jobsError ? (jobsError as Error).message : null

  const stats: Stats = useMemo(() => {
    const totalJobs = jobs.length
    const completedJobs = jobs.filter((job) => job.status === "completed").length
    return {
      totalJobs,
      inProgressJobs: jobs.filter((job) => job.status === "in_progress").length,
      totalWorkers: new Set(jobs.flatMap((job) => (job.workers || []).map((w) => w.id))).size,
      completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
      avgRating: 4.8, // Static for now
      // Employer-owned jobs have no client, so job.client is undefined — reading
      // .name off it crashed the whole dashboard. Count distinct clients by a
      // stable id, skipping clientless jobs.
      totalClients: new Set(
        jobs
          .map((job) => job.client?.id ?? (job.client as any)?.publicId)
          .filter(Boolean),
      ).size,
      pendingJobs: jobs.filter((job) => job.status === "scheduled").length,
      completedJobs,
      totalRevenue: 2450000, // Static for now
      monthlyGrowth: 18.5, // Static for now
    }
  }, [jobs])

  // Unique work centers from jobs data (support workCenter or workCenters)
  const workCenters = useMemo(
    () =>
      Array.from(
        new Set(
          jobs.map((job) => job.workCenter?.name || (job as any).workCenters?.[0]?.name || (job as any).workCenterNames || ""),
        ),
      ).filter(Boolean),
    [jobs],
  )

  const { data: pendingRequestsCount = 0 } = useQuery({
    queryKey: ["manual-attendance", "pending-count"],
    queryFn: async () => {
      const j = await apiFetch<any>("/manual-attendance/requests/pending/count")
      return j?.data?.count ?? 0
    },
    enabled: isAuthenticated,
  })

  // The four "needs your attention" counters are independent — one query
  // fetching them in parallel keeps them a single cache entry.
  const { data: attn = { incidents: 0, clientRequests: 0, absences: 0, overdueInvoices: 0 } } = useQuery({
    queryKey: ["dashboard", "attention"],
    queryFn: async () => {
      const countList = (url: string, filter?: (x: any) => boolean) =>
        apiFetch<any>(url)
          .then((j) => {
            const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
            return filter ? arr.filter(filter).length : arr.length
          })
          .catch(() => 0)
      const [incidents, clientRequests, absences, overdueInvoices] = await Promise.all([
        countList("/jobs/incidents"),
        countList("/client-requests", (r) => (r.status || "").toLowerCase() === "pending"),
        countList("/absences", (r) => (r.status || "").toLowerCase() === "pending"),
        countList("/client/all/invoices", (r) => (r.status || "").toUpperCase() === "OVERDUE"),
      ])
      return { incidents, clientRequests, absences, overdueInvoices }
    },
    enabled: isAuthenticated,
  })

  // Live presence
  const { data: control = [] } = useQuery({
    queryKey: ["jobs", "control"],
    queryFn: async () => {
      const j = await apiFetch<any>("/jobs/control")
      return Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.jobs) ? j.data.jobs : []
    },
    enabled: isAuthenticated,
  })

  const { todayJobIds, liveJobIds, liveStats } = useMemo(() => {
    const today = new Set<string>(control.map((x: any) => x.publicId).filter(Boolean))
    const live = new Set<string>(
      control
        .filter((x: any) => Array.isArray(x.workers) && x.workers.some((w: any) => (w.checkedIn || w.checkInTime) && !w.checkOutTime))
        .map((x: any) => x.publicId)
        .filter(Boolean),
    )
    let workingNow = 0, notChecked = 0, checkedOut = 0
    for (const x of control) for (const w of x.workers || []) {
      if (w.checkOutTime) checkedOut++
      else if (w.checkedIn || w.checkInTime) workingNow++
      else notChecked++
    }
    return { todayJobIds: today, liveJobIds: live, liveStats: { workingNow, notChecked, checkedOut } }
  }, [control])

  // Real-time: the WebSocket invalidates the control query on check-in/out
  // events, so no interval polling is needed on top of it.
  useEffect(() => {
    if (!session?.accessToken) return
    const socket = acquireSocket(session.accessToken)
    const onAlert = (a: any) => {
      const type = a?.type
      if (type === "CHECK_IN" || type === "CHECK_OUT" || type === "BREAK_START" || type === "BREAK_END") {
        queryClient.invalidateQueries({ queryKey: ["jobs", "control"] })
      }
    }
    socket.on("alerts:new", onAlert)
    return () => {
      socket.off("alerts:new", onAlert)
      releaseSocket(session.accessToken)
    }
  }, [session?.accessToken, queryClient])

  const handleViewDetails = (job: Job) => {
    router.push(`/jobs/${job.publicId || job.id}/detail`)
  }

  const handleEditJob = (jobId: string | number) => {
    setSelectedJobForDetail(jobId.toString())
  }

  const handleJobAdded = (newJob: any) => {
    // Refresh jobs list after adding a new job
    fetchJobs()
  }

  const handleBackFromDetail = () => {
    setSelectedJobForDetail(null)
  }

  const filteredJobs = jobs.filter((job) =>
    jobMatchesFilters(job, {
      search: searchTerm,
      status: statusFilter,
      workCenter: workCenterFilter,
      occupation: occupationFilter,
      client: clientFilter,
      worker: workerFilter,
    }),
  )

  const isTodayJob = (j: Job) => todayJobIds.has(j.publicId || "")
  const isLiveJob = (j: Job) => liveJobIds.has(j.publicId || "")
  const todayCount = filteredJobs.filter(isTodayJob).length
  const liveCount = filteredJobs.filter(isLiveJob).length
  const displayedJobs = jobsTab === "today" ? filteredJobs.filter(isTodayJob) : jobsTab === "live" ? filteredJobs.filter(isLiveJob) : filteredJobs
  const localeMap: Record<string, string> = { en: "en-GB", es: "es-ES", de: "de-DE" }
  const todayLabel = new Date().toLocaleDateString(localeMap[language] || "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const employerDisplayName = (session?.user as any)?.name || "Employer"

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
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => fetchJobs()}>
              {t("tryAgain")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-4 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{tg("hello") || "Hello"}, {employerDisplayName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayLabel}</p>
          </div>
          {/* Clase badge (Particular / Empresa / Autónomo), mirroring the
              partner dashboard's tier badge. subTypeId: 1=INDIVIDUAL,
              2=FREELANCER, 3=COMPANY. */}
          {(() => {
            const key = ({ 1: "INDIVIDUAL", 2: "FREELANCER", 3: "COMPANY" } as Record<number, string>)[(me as any)?.subTypeId]
            if (!key) return null
            return (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E4D5F3] dark:border-purple-900 bg-[#F2EAFA] dark:bg-purple-950/40 text-[#4A1F6B] dark:text-purple-300 font-bold text-sm px-4 py-2">
                ◆ {tEnum("employerSubType", key)}
              </span>
            )
          })()}
        </div>

        <section className="space-y-3">
          <SectionLabel>{tg("needsAttention") || "Needs your attention"}</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <AttentionCard value={attn.incidents} label={tg("incidents") || "Incidents"} Icon={AlertTriangle} tone="crit" onClick={() => router.push("/jobs/incidents")} />
            <AttentionCard value={pendingRequestsCount} label={tg("manualAttendance") || "Manual attendance"} Icon={ConsultIcon} tone="warn" onClick={() => router.push("/jobs/manual-requests")} />
            <AttentionCard value={attn.clientRequests} label={tg("clientRequests") || "Client requests"} Icon={ClientMenuIcon} tone="info" onClick={() => router.push("/jobs/client-requests")} />
            <AttentionCard value={attn.absences} label={tg("workerAbsences") || "Worker absences"} Icon={WorkersMenuIcon} tone="warn" onClick={() => router.push("/absences")} />
            <AttentionCard value={attn.overdueInvoices} label={tg("overdueInvoices") || "Overdue invoices"} Icon={InvoicesIcon} tone="crit" onClick={() => router.push("/client-invoices")} />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>{tg("quickActions") || "Quick actions"}</SectionLabel>
          <div className="flex flex-wrap gap-3">
            <ActionButton primary Icon={JobsIcon} label={tg("newJob") || "New job"} onClick={() => setShowAddJobModal(true)} />
            <ActionButton Icon={SalaryIcon} label={tg("salaries") || "Salaries"} onClick={() => router.push("/salaries")} />
            <ActionButton Icon={InvoicesIcon} label={tg("clientInvoices") || "Client invoices"} onClick={() => router.push("/client-invoices")} />
            <ActionButton Icon={InviteIcon} label={tg("invite") || "Invite"} onClick={() => router.push("/utilities/invite")} />
          </div>
        </section>

        {/* Pending Manual Attendance Requests Banner */}
        {pendingRequestsCount > 0 && (
          <Card className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-yellow-400">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {pendingRequestsCount} {t("pendingAttendanceRequests") || "pending attendance request(s)"}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                onClick={() => router.push("/jobs/control")}
              >
                {t("reviewNow") || "Review Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trial-ended → payment method required banner. Shown on every load
            until the employer submits a payment method (which flips them
            from AWAITING_PAYMENT_METHOD to ACTIVE). */}
        {billingStatus === "AWAITING_PAYMENT_METHOD" && (() => {
          // `t()` returns the key itself when missing — explicit fallback
          // so a stale bundle still shows readable English instead of the
          // raw camelCase key in the banner.
          const headlineRaw = t("trialEnded")
          const headline =
            headlineRaw && headlineRaw !== "trialEnded"
              ? headlineRaw
              : "Your trial has ended"
          const bodyRaw = t("trialEndedAddPaymentMethod")
          const body =
            bodyRaw && bodyRaw !== "trialEndedAddPaymentMethod"
              ? bodyRaw
              : "Add a payment method to continue using ControlJobs without interruption."
          const ctaRaw = t("addPaymentMethod")
          const cta =
            ctaRaw && ctaRaw !== "addPaymentMethod" ? ctaRaw : "Add payment method"
          return (
            <Card className="border-l-4 border-l-amber-500 border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/40 dark:from-amber-950/40 dark:to-amber-950/10 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {headline}
                    </p>
                    <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5 leading-relaxed">
                      {body}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPaymentMethodModal(true)}
                  className="bg-[#6B21A8] hover:bg-[#5b1d91] text-white shadow-sm gap-1.5 shrink-0"
                >
                  {cta}
                  <span aria-hidden>→</span>
                </Button>
              </CardContent>
            </Card>
          )
        })()}

        {pendingRateChange && (() => {
          const effDate = (() => {
            const m = pendingRateChange.effectiveAt.match(/^(\d{4})-(\d{2})-(\d{2})/)
            return m ? `${m[3]}/${m[2]}/${m[1]}` : pendingRateChange.effectiveAt
          })()
          const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} €`
          return (
            <Card className="border-l-4 border-l-amber-500 border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/40 dark:from-amber-950/40 dark:to-amber-950/10 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          {t("upcomingRateChange")}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200">
                          {t("upcomingRateChangeBody")} {effDate}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                        <div className="flex justify-between sm:block">
                          <span className="text-amber-800/70 dark:text-amber-300/70">
                            {t("fixedFee")}
                          </span>
                          <strong className="ml-2 sm:ml-0 sm:block sm:mt-0.5 text-sm">
                            {fmt(pendingRateChange.monthlyFixed)}
                          </strong>
                        </div>
                        <div className="flex justify-between sm:block">
                          <span className="text-amber-800/70 dark:text-amber-300/70">
                            {t("perWorkCenter")}
                          </span>
                          <strong className="ml-2 sm:ml-0 sm:block sm:mt-0.5 text-sm">
                            {fmt(pendingRateChange.perWorkCenter)}
                          </strong>
                        </div>
                        <div className="flex justify-between sm:block">
                          <span className="text-amber-800/70 dark:text-amber-300/70">
                            {t("perWorker")}
                          </span>
                          <strong className="ml-2 sm:ml-0 sm:block sm:mt-0.5 text-sm">
                            {fmt(pendingRateChange.perWorker)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/billing")}
                    className="border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 shadow-sm shrink-0"
                  >
                    {t("viewBilling")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Live presence tiles */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <SectionLabel>{tg("liveNow") || "Live now"}</SectionLabel>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            {[
              { v: liveStats.workingNow, l: tg("workingNow") || "Working now", bar: "bg-emerald-500" },
              { v: liveStats.notChecked, l: tg("notCheckedIn") || "Not checked in", bar: "bg-amber-500" },
              { v: liveStats.checkedOut, l: tg("checkedOut") || "Checked out", bar: "bg-slate-400" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className={`h-1 w-full ${s.bar}`} />
                <div className="p-3">
                  <div className="text-2xl font-bold tabular-nums text-foreground">{s.v}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Jobs tabs: Today / Live / All */}
        <div className="flex flex-wrap gap-1 border-b border-border">
          {(["today", "live", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setJobsTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${jobsTab === tab ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}
            >
              {tab === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {tab === "today" ? (tg("todaysJobs") || "Today's jobs") : tab === "live" ? (tg("live") || "Live") : (tg("allJobs") || "All jobs")}
              <span className="text-xs">({tab === "today" ? todayCount : tab === "live" ? liveCount : filteredJobs.length})</span>
            </button>
          ))}
        </div>

        <JobFilterBar
          search={searchTerm}
          onSearch={setSearchTerm}
          status={statusFilter}
          onStatus={setStatusFilter}
          workCenter={workCenterFilter}
          onWorkCenter={setWorkCenterFilter}
          workCenters={jobWorkCenters(jobs)}
          occupation={occupationFilter}
          onOccupation={setOccupationFilter}
          occupations={jobOccupations(jobs)}
          client={clientFilter}
          onClient={setClientFilter}
          clients={jobClients(jobs)}
          worker={workerFilter}
          onWorker={setWorkerFilter}
          workers={jobWorkers(jobs)}
        />

        <Card className="border border-border shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedJobs.map((job) => (
                <EmployerJobCard
                  key={job.id}
                  job={(isLiveJob(job) ? { ...job, status: "in_progress" } : job) as any}
                  onViewDetails={(j: any) => handleViewDetails(j as any)}
                  onEdit={handleEditJob}
                  onViewRecords={(j: any) => handleViewDetails(j as any)}
                  onAddManualAttendance={(j: any) => {
                    setManualAttendanceJob(j);
                    setShowManualAttendanceForm(true);
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {displayedJobs.length === 0 && !loading && !error && (
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

      {/* Manual Attendance Direct Entry Modal */}
      <ManualAttendanceRequestForm
        open={showManualAttendanceForm}
        onOpenChange={setShowManualAttendanceForm}
        job={manualAttendanceJob}
        mode="direct"
        onSuccess={() => {
          setShowManualAttendanceForm(false);
        }}
      />

      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        initialPaymentMethodId={currentPaymentMethodId}
        trialEndedMode={billingStatus === "AWAITING_PAYMENT_METHOD"}
        onSaved={({ paymentMethodId, billingStatus: nextStatus }) => {
          // Patch the cache so the banner clears immediately, same as the
          // old local state did — no extra round trip.
          queryClient.setQueryData(["employers", "me"], (prev: any) =>
            prev
              ? { ...prev, paymentMethodId, ...(nextStatus ? { billingStatus: nextStatus } : {}) }
              : prev,
          )
        }}
      />
    </div>
  )
}
