"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ClipboardList, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import { ClientJobCard } from "../worker-dashboard/job-card"
import SurveyFillDialog from "@/components/surveys/survey-fill-dialog"
import { surveyStatus, SurveyEntry } from "@/lib/survey-client"
import { acquireSocket, releaseSocket } from "@/lib/socket"
import { JobFilterBar, jobMatchesFilters, jobWorkCenters, jobWorkers, jobOccupations, StatCard, AttentionCard, ActionButton, SectionLabel, ListPanel, ListRow, RowAvatar, StatusChip } from "../dashboard-widgets"
import { useRouter } from "next/navigation"
import { Briefcase, Users, LogIn, CheckCircle2, MessageSquare, Plus, Calendar } from "lucide-react"
import InvoicesIcon from "../../../icons/Menu/invoices.svg"
import ManualAttendanceRequestForm from "@/components/manual-attendance/manual-attendance-request-form"
import { DEFAULT_TIMEZONE, formatLocalDate } from "@/lib/datetime"

interface ApiJob {
  jobId: number
  publicId?: string
  jobNo: string
  jobName: string
  clientName: string
  workCenter?: string
  workCenters?: Array<{ id?: number; publicId?: string; name?: string }>
  workCenterNames?: string
  status: string
  startDate: string
  endDate: string
  workers: Array<{
    id: number
    code: string
    name: string
  }>
  // Backend returns scheduleType / totalShifts / expectedDuration for client jobs
  scheduleType?: "free" | "normal" | "summer" | string
  totalShifts?: number
  expectedDuration?: number
  activeScheduleWeekHours?: number | null
  tasks: Array<{
    id: number
    name: string
    expectedDuration: number
    isCompleted?: boolean
    completedAt?: string
    completedByWorkerId?: number
  }>
  signingMethods?: Array<{ methodType?: string; methodDetails?: any; verifyIdentity?: boolean }>
  workSession?: {
    id: number
    checkInTime: string
    checkOutTime?: string
    isOnBreak: boolean
    currentBreakStart?: string
    totalWorkMinutes: number
    totalBreakMinutes: number
  } | null
  attendanceRecords?: Array<{
    id: number
    checkInTime: string
    checkOutTime?: string
    date: string
  }>
}

interface Job {
  id: number
  publicId?: string
  jobId: string
  title: string
  description: string
  worker: {
    name: string
    avatar: string
    completedJobs: number
  }
  client: {
    name: string
    address: string
    phone: string
  }
  schedule: {
    date: string
    startTime: string
    endTime: string
    estimatedHours: number
    scheduleType: "fixed" | "flexible"
  }
  status: "scheduled" | "pending" | "in_progress" | "completed" | "cancelled" | "on_hold"
  startDate: Date
  endDate: Date
  checkin?: {
    time: string
    method: string
    location: { lat: number; lng: number; accuracy: string }
    photo: boolean
    ip: string
    wifi: string
  }
  checkout?: {
    time: string
    method: string
  }
  timeTracking: {
    breaks: Array<{ start: string; end: string; duration: number }>
    activities: Array<{ time: string; action: string; location: string }>
  }
  qrCode: {
    code: string
    image?: string
    generatedAt: string
    expiresAt: string
  }
  verificationMethods: string[]
  geofence: {
    enabled: boolean
    radius: number
    center: { lat: number; lng: number }
  }
  checklist: Array<{
    id: number
    task: string
    completed: boolean
    time?: string
  }>
  alerts: Array<{ type: string; message: string; time: string }>
  feedback?: string
  surveyCompleted?: boolean
  clientSurvey?: {
    rating: number
    comments: string
    submitted: boolean
    submittedAt?: Date
  }
  isWorkerCheckedIn: boolean
  hasAttendanceRecord: boolean
  expectedHours: number
  jobDurationDays: number
}

interface ClientStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  satisfactionRate: number
  responseTime: number
  savings: number
}

export default function ClientDashboard() {
  const { t } = useTranslation("dashboard")
  const { t: tg, language } = useTranslation()
  const { t: tf } = useTranslation("fichaje-cards")
  const { session, logout, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [jobsTab, setJobsTab] = useState<"today" | "live" | "all">("today")

  // Customer-survey status per job publicId, + fill dialog.
  const [surveyMap, setSurveyMap] = useState<Record<string, SurveyEntry | null>>({})
  const [surveyDialog, setSurveyDialog] = useState<SurveyEntry | null>(null)
  const loadClientSurvey = async (job: any) => {
    const pub = String(job.publicId || job.id)
    if (!session?.accessToken || surveyMap[pub] !== undefined) return
    const st = await surveyStatus(session.accessToken, pub)
    setSurveyMap((m) => ({ ...m, [pub]: st?.customer || null }))
  }
  const clientSurveyState = (job: any): "pending" | "done" | null => {
    const entry = surveyMap[String(job.publicId || job.id)]
    if (!entry) return null
    return entry.filled ? "done" : "pending"
  }
  const handleClientFillSurvey = async (job: any) => {
    const pub = String(job.publicId || job.id)
    let entry = surveyMap[pub]
    if (entry === undefined) {
      const st = await surveyStatus(session?.accessToken || "", pub)
      entry = st?.customer || null
      setSurveyMap((m) => ({ ...m, [pub]: entry }))
    }
    if (!entry || entry.filled) return
    setSurveyDialog(entry)
  }

  const { data: dayJobs } = useQuery<any[]>({
    queryKey: ["jobs", "client", "day"],
    queryFn: async () => {
      const j = await apiFetch<any>("/jobs/client/day")
      return Array.isArray(j?.data?.jobs) ? j.data.jobs : []
    },
    enabled: isAuthenticated,
  })

  const { data: clientRequests } = useQuery<any[]>({
    queryKey: ["client-requests", "mine"],
    queryFn: async () => {
      const j = await apiFetch<any>("/client-requests/mine")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: isAuthenticated,
  })

  // Derived straight from the queries — no state to keep in sync.
  const cd = useMemo(() => {
    const jobs = dayJobs ?? []
    const reqs = clientRequests ?? []
    let checkedIn = 0
    let notChecked = 0
    const workerSet = new Set<string>()
    for (const job of jobs) {
      for (const w of job.workers || []) {
        workerSet.add(String(w.id ?? w.publicId ?? w.name))
        if (w.active || w.checkInTime) checkedIn++
        else notChecked++
      }
    }
    return {
      todayIds: jobs.map((x: any) => x.publicId).filter(Boolean),
      liveIds: jobs
        .filter((job: any) => (job.workers || []).some((w: any) => w.active || (w.checkInTime && !w.checkOutTime)))
        .map((x: any) => x.publicId)
        .filter(Boolean),
      workersToday: workerSet.size,
      checkedInNow: checkedIn,
      workerNotCheckedIn: notChecked,
      pendingRequests: reqs.filter((r: any) => r.status === "pending").length,
      recentRequests: reqs.slice(0, 3),
    }
  }, [dayJobs, clientRequests])

  // Real-time: the WebSocket invalidates the day query on check-in/out
  // events, so no interval polling is needed on top of it.
  useEffect(() => {
    if (!session?.accessToken) return
    const socket = acquireSocket(session.accessToken)
    const onAlert = (a: any) => {
      const type = a?.type
      if (type === "CHECK_IN" || type === "CHECK_OUT" || type === "BREAK_START" || type === "BREAK_END") {
        queryClient.invalidateQueries({ queryKey: ["jobs", "client", "day"] })
      }
    }
    socket.on("alerts:new", onAlert)
    return () => {
      socket.off("alerts:new", onAlert)
      releaseSocket(session.accessToken)
    }
  }, [session?.accessToken, queryClient])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Tabs removed: always show job cards directly
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [workCenterFilter, setWorkCenterFilter] = useState("all")
  const [occupationFilter, setOccupationFilter] = useState("all")
  const [workerFilter, setWorkerFilter] = useState("all")

  const [currentView, setCurrentView] = useState("dashboard")
  const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null)

  const [clientStats, setClientStats] = useState<ClientStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    satisfactionRate: 92,
    responseTime: 2.5,
    savings: 8500,
  })

  const [jobs, setJobs] = useState<Job[]>([])

  // Preload customer-survey status for the client's jobs so cards can show the survey button.
  useEffect(() => {
    if (!session?.accessToken) return
    jobs.forEach((j) => loadClientSurvey(j))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, session?.accessToken])
  const [manualAttendanceJob, setManualAttendanceJob] = useState<any>(null)
  const [showManualAttendanceForm, setShowManualAttendanceForm] = useState(false)

  const transformApiJobToJob = (apiJob: ApiJob): Job => {
    const currentDate = new Date()
    const startDate = new Date(apiJob.startDate + "T00:00:00")
    const endDate = new Date(apiJob.endDate + "T00:00:00")
    const jobDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Backend for client jobs provides scheduleType / expectedDuration / totalShifts
  const scheduleRaw = (apiJob as any).scheduleType || "free"
  // Map backend schedule to our internal representation: free -> flexible, normal/summer -> fixed
  const isFlexible = String(scheduleRaw).toLowerCase() === "free"
  const primaryWorker = Array.isArray(apiJob.workers) && apiJob.workers.length > 0 ? apiJob.workers[0] : { id: 0, code: "N/A", name: "Unassigned" }

    const mockClient = {
      name: apiJob.clientName,
      address: `${apiJob.workCenterNames || (apiJob as any).workCenter || ''}, Building A`,
      phone: "+1 (555) 123-4567",
    }

    const hasAttendanceRecord =
      Boolean(
        apiJob.attendanceRecords &&
          apiJob.attendanceRecords.length > 0 &&
          apiJob.attendanceRecords.some((record) => record.checkInTime && record.checkOutTime),
      ) || Boolean(apiJob.workSession?.checkInTime && apiJob.workSession?.checkOutTime)

    let status: "scheduled" | "pending" | "in_progress" | "completed"

    if (currentDate > endDate) {
      status = hasAttendanceRecord ? "completed" : "scheduled"
    } else {
      status = hasAttendanceRecord || apiJob.workSession?.checkInTime ? "in_progress" : "scheduled"
    }

    const isWorkerCheckedIn = status === "in_progress" || status === "completed"

    const checklist = (apiJob.tasks || []).map((task) => ({
      id: task.id,
      task: task.name,
      completed: task.isCompleted || false,
      time: task.completedAt
        ? new Date(task.completedAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: DEFAULT_TIMEZONE,
          })
        : undefined,
    }))

    const totalExpectedDuration =
      typeof apiJob.expectedDuration === "number"
        ? apiJob.expectedDuration
        : (apiJob.tasks || []).reduce((sum, task) => sum + (task.expectedDuration || 0), 0) || 8

    return {
      id: apiJob.jobId,
      publicId: apiJob.publicId,
      jobId: apiJob.jobNo || `JOB-${String(apiJob.jobId).padStart(3, "0")}`,
      title: apiJob.jobName,
      // keep original jobName for components expecting it
      jobName: apiJob.jobName,
      description: `${apiJob.jobName} at ${apiJob.workCenterNames || (apiJob as any).workCenter || ''}`,
      worker: {
        name: primaryWorker.name,
        avatar: "👨‍💼",
        completedJobs: 0,
      },
      client: mockClient,
      schedule: {
        date: startDate.toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        estimatedHours: totalExpectedDuration,
        scheduleType: isFlexible ? "flexible" : "fixed",
      },
      status: status as "scheduled" | "pending" | "in_progress" | "completed" | "cancelled" | "on_hold",
      startDate,
      endDate,
      timeTracking: {
        breaks: [],
        activities: [],
      },
      qrCode: {
        code: `SECURE-JOB-${String(apiJob.jobId).padStart(3, "0")}-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      },
      // Map signing methods from API if present
      verificationMethods: Array.isArray((apiJob as any).signingMethods)
        ? (apiJob as any).signingMethods.flatMap((m: any) => {
            const d = m.methodDetails || []
            return Array.isArray(d) ? d.map((x: any) => String(x).toLowerCase()) : [String(d).toLowerCase()]
          })
        : ["qr-code", "wifi-network", "gps-location"],
      geofence: {
        enabled: true,
        radius: 50,
        center: { lat: 40.7128, lng: -74.006 },
      },
      checklist,
      alerts: [],
      isWorkerCheckedIn,
      hasAttendanceRecord,
      expectedHours: totalExpectedDuration,
      jobDurationDays,
      // Expose fields expected by ClientJobCard
      workCenters: Array.isArray((apiJob as any).workCenters)
        ? (apiJob as any).workCenters.map((w: any) => ({ id: w.id, name: w.name }))
        : (apiJob as any).workCenter
        ? [{ id: 0, name: (apiJob as any).workCenter }]
        : [],
      workCenterNames: (apiJob as any).workCenterNames || "",
      // expose original clientName too
      clientName: apiJob.clientName,
      // Tasks expected by ClientJobCard
      tasks: (apiJob.tasks || []).map((t) => ({ id: t.id, name: t.name, expectedDuration: t.expectedDuration })),
      workers: Array.isArray(apiJob.workers) ? apiJob.workers : [],
      signingMethods: Array.isArray((apiJob as any).signingMethods) ? (apiJob as any).signingMethods : [],
      scheduleType: (apiJob as any).scheduleType || "",
      expectedDuration: typeof (apiJob as any).expectedDuration === "number" ? (apiJob as any).expectedDuration : totalExpectedDuration,
      totalShifts: typeof (apiJob as any).totalShifts === "number" ? (apiJob as any).totalShifts : 0,
      activeScheduleWeekHours: (apiJob as any).activeScheduleWeekHours ?? null,
      jobStatus: (apiJob as any).status || (apiJob as any).jobStatus || (status as any),
    }
  }

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("clientToken") || session?.accessToken
      if (!token) {
        throw new Error("No authentication token found")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
      const response = await fetch(`${baseUrl}/jobs/client/all-jobs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          return
        } else if (response.status === 403) {
          throw new Error("Access denied. You don't have permission to view jobs.")
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.")
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      const result = await response.json()

      if (result.isSuccess && result.data) {
        const transformedJobs = result.data.map(transformApiJobToJob)
        setJobs(transformedJobs)

        const totalJobs = transformedJobs.length
        const activeJobs = transformedJobs.filter(
          (job: Job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress",
        ).length
        const completedJobs = transformedJobs.filter((job: Job) => job.status === "completed").length

        setClientStats((prev) => ({
          ...prev,
          totalJobs,
          activeJobs,
          completedJobs,
        }))
      } else {
        throw new Error(result.message || "Failed to fetch jobs")
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch jobs")
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    fetchJobs()
  }

  useEffect(() => {
    if (session?.accessToken) {
      fetchJobs()
    }
  }, [session?.accessToken])


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    })
  }

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
    if (start === end) {
      return start
    }
    return `${start} - ${end}`
  }

  const generateQRCodeFromData = async (qrData: any): Promise<string> => {
    console.log("🎯 generateQRCodeFromData called with:", qrData)

    try {
      const QRCode = require("qrcode")
      const dataString = JSON.stringify(qrData)
      console.log("🎯 QR data string:", dataString)

      const qrCodeUrl = await QRCode.toDataURL(dataString, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      console.log("✅ QR code generated successfully with QRCode library")
      console.log("✅ QR code URL length:", qrCodeUrl.length)

      return qrCodeUrl
    } catch (error) {
      console.error("❌ Error in generateQRCodeFromData:", error)

      const fallbackSVG = `
      <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" fill="white" stroke="#000" strokeWidth="2"/>
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="black" strokeWidth="4"/>
        <rect x="30" y="30" width="40" height="40" fill="black"/>
        <rect x="40" y="40" width="20" height="20" fill="white"/>
        <rect x="176" y="20" width="60" height="60" fill="none" stroke="black" strokeWidth="4"/>
        <rect x="186" y="30" width="40" height="40" fill="black"/>
        <rect x="196" y="40" width="20" height="20" fill="white"/>
        <rect x="20" y="176" width="60" height="60" fill="none" stroke="black" strokeWidth="4"/>
        <rect x="30" y="186" width="40" height="40" fill="black"/>
        <rect x="40" y="196" width="20" height="20" fill="white"/>
        <text x="128" y="130" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="black">
          Job: ${qrData.jobId || "N/A"}
        </text>
        <text x="128" y="150" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="gray">
          ${(qrData.jobName || "Unknown").substring(0, 20)}
        </text>
      </svg>
    `

      return "data:image/svg+xml;base64," + btoa(fallbackSVG)
    }
  }

  const generateQRCode = async (jobId: number) => {
    try {
      console.log("🎯 Generating QR code for job ID:", jobId)
      const token = localStorage.getItem("clientToken") || session?.accessToken
      if (!token) {
        throw new Error("No authentication token found")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
      console.log("🎯 API Base URL:", baseUrl)

      const response = await fetch(`${baseUrl}/jobs/generate-qr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      })

      console.log("🎯 QR API Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("🎯 QR API Result:", result)

      if (result.qrData) {
        const qrImage = await generateQRCodeFromData(result.qrData)

        const updatedJob = {
          code: JSON.stringify(result.qrData),
          image: qrImage,
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        }

        console.log("✅ QR code generated successfully:", updatedJob.image.substring(0, 50) + "...")

        setJobs((currentJobs) =>
          currentJobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  qrCode: updatedJob,
                }
              : job,
          ),
        )

        setSelectedJobDetails((current) =>
          current?.id === jobId
            ? {
                ...current,
                qrCode: updatedJob,
              }
            : current,
        )
      }
    } catch (error) {
      console.error("❌ Backend QR generation failed:", error)
      console.log("🎯 Falling back to mock QR code generation")
      await generateMockQRCode(jobId)
    }
  }

  const handleViewDetails = async (job: Job) => {
    console.log("🎯 handleViewDetails called for job:", job.id)
    setSelectedJobDetails(job)
    setCurrentView("attendanceDetails")

    console.log("🎯 IMMEDIATE QR generation for job:", job.id)

    const immediateQRData = {
      jobId: job.publicId || job.id,
      jobName: job.title,
      clientName: job.client.name,
      timestamp: new Date().toISOString(),
      token: `IMMEDIATE-${job.publicId || job.id}-${Date.now()}`,
    }

    console.log("🎯 Immediate QR data:", immediateQRData)

    try {
      const qrImage = await generateQRCodeFromData(immediateQRData)
      console.log("🎯 QR image generated:", qrImage.substring(0, 50) + "...")

      const updatedJobWithQR = {
        ...job,
        qrCode: {
          code: JSON.stringify(immediateQRData),
          image: qrImage,
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      }

      console.log("🎯 Setting selectedJobDetails with QR code...")
      setSelectedJobDetails(updatedJobWithQR)

      setJobs((currentJobs) => currentJobs.map((j) => (j.id === job.id ? updatedJobWithQR : j)))

      console.log("✅ QR code set immediately! Should be visible now.")
    } catch (error) {
      console.error("❌ Immediate QR generation failed:", error)
      setSelectedJobDetails(job)
    }

    try {
      console.log("🎯 Trying backend QR generation in background...")
      await generateQRCode(job.id)
    } catch (error) {
      console.log("⚠️ Backend QR failed, but immediate QR should be showing:", error)
    }
  }

  const generateMockQRCode = async (jobId: number) => {
    try {
      console.log("🎯 Generating mock QR code for job ID:", jobId)

      const mockData = {
        jobId: jobId,
        type: "check-in",
        timestamp: new Date().toISOString(),
        code: `SECURE-JOB-${String(jobId).padStart(3, "0")}-${Date.now()}`,
      }

      const qrImage = await generateQRCodeFromData(mockData)

      const updatedJob = {
        code: JSON.stringify(mockData),
        image: qrImage,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      }

      console.log("✅ Mock QR code generated:", updatedJob.image.substring(0, 50) + "...")

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                qrCode: updatedJob,
              }
            : job,
        ),
      )

      setSelectedJobDetails((current) =>
        current?.id === jobId
          ? {
              ...current,
              qrCode: updatedJob,
            }
          : current,
      )

      console.log("✅ Mock QR code set successfully!")
    } catch (error) {
      console.error("❌ Failed to generate mock QR code:", error)
    }
  }


  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("errorLoadingJobs")}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRetry} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("tryAgain")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const transformJobToJobAssignment = (job: Job) => {
    return {
      id: job.id,
      publicId: job.publicId,
      jobId: job.jobId,
      title: job.title,
      client: {
        id: 1,
        name: job.client.name,
      },
      workCenter: {
        id: 1,
        name: job.client.address.split(",")[0] || job.client.address,
        address: job.client.address,
        coordinates: { lat: 40.7128, lng: -74.006 },
      },
      shift: {
        type: "morning" as const,
        startTime: job.schedule.startTime,
        endTime: job.schedule.endTime,
        duration: `${job.expectedHours}h`,
        scheduleType: job.schedule.scheduleType as "fixed" | "flexible",
      },
      status: job.status as "scheduled" | "in_progress" | "completed",
      startDate: job.startDate,
      endDate: job.endDate,
      signingMethods: {
        qrCode: job.verificationMethods.includes("qr-code"),
        gps: job.verificationMethods.includes("gps-location"),
        wifi: job.verificationMethods.includes("wifi-network"),
        ip: job.verificationMethods.includes("ip-address"),
        callerId: false,
      },
      tasks: job.checklist.map((item) => ({
        id: item.id,
        name: item.task,
        description: item.task,
        completed: item.completed,
        duration: "1h",
        timing: "during" as const,
      })),
      checkInTime: job.checkin ? new Date(job.checkin.time) : undefined,
      checkOutTime: job.checkout ? new Date(job.checkout.time) : undefined,
      breakTime: 0,
      workedTime: 0,
      expectedHours: job.expectedHours,
      totalHours: job.expectedHours,
      breakStartTime: undefined,
      totalBreakTime: 0,
      isOnBreak: false,
      tags: [],
      hasAttendanceRecord: job.hasAttendanceRecord,
    }
  }

  const handleViewAttendanceDetails = (job: Job) => {
    const jobAssignment = transformJobToJobAssignment(job)
    setSelectedJobDetails(job)
    setCurrentView("attendanceDetails")
  }

  if (currentView === "attendanceDetails" && selectedJobDetails) {
    const jobAssignment = transformJobToJobAssignment(selectedJobDetails)
    return <JobAttendanceDetail job={jobAssignment} onBack={() => setCurrentView("dashboard")} />
  }

  const filteredJobs = jobs.filter((job) =>
    jobMatchesFilters(job, { search: searchTerm, status: statusFilter, workCenter: workCenterFilter, occupation: occupationFilter, worker: workerFilter }),
  )
  const displayedJobs = jobsTab === "today" ? filteredJobs.filter((j: any) => cd.todayIds.includes(j.publicId)) : jobsTab === "live" ? filteredJobs.filter((j: any) => (cd.liveIds || []).includes(j.publicId)) : filteredJobs
  const localeMap: Record<string, string> = { en: "en-GB", es: "es-ES", de: "de-DE" }
  const todayLabel = new Date().toLocaleDateString(localeMap[language] || "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const clientName = (session?.user as any)?.name || t("clientDashboard")

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tg("hello") || "Hello"}, {clientName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayLabel}</p>
        </div>

        <section className="space-y-3">
          <SectionLabel>{tg("overview") || "Overview"}</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard value={clientStats.activeJobs} label={tg("activeJobs") || "Active jobs"} Icon={Briefcase} tone="brand" />
            <StatCard value={cd.workersToday} label={tg("workersToday") || "Workers today"} Icon={Users} tone="info" />
            <StatCard value={cd.checkedInNow} label={tg("checkedInNow") || "Checked in now"} Icon={LogIn} tone="good" />
            <StatCard value={clientStats.completedJobs} label={tg("completedJobs") || "Completed"} Icon={CheckCircle2} tone="brand" />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>{tg("needsAttention") || "Needs your attention"}</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AttentionCard value={cd.workerNotCheckedIn} label={tg("workerNotCheckedIn") || "Worker not checked in"} Icon={Users} tone="warn" onClick={() => router.push("/jobs/control")} />
            <AttentionCard value={cd.pendingRequests} label={tg("pendingRequests") || "Pending requests"} Icon={MessageSquare} tone="info" onClick={() => router.push("/jobs/solicitudes")} />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>{tg("quickActions") || "Quick actions"}</SectionLabel>
          <div className="flex flex-wrap gap-3">
            <ActionButton primary Icon={Plus} label={tg("newRequest") || "New request"} onClick={() => router.push("/jobs/solicitudes")} />
            <ActionButton Icon={Calendar} label={tg("calendar") || "Calendar"} onClick={() => router.push("/calendar")} />
            <ActionButton Icon={InvoicesIcon} label={tg("invoices") || "Invoices"} onClick={() => router.push("/my-client-invoices")} />
            <ActionButton Icon={ClipboardList} label={tg("attendance") || "Attendance"} onClick={() => router.push("/presence/history")} />
          </div>
        </section>

        <Card className="border border-border shadow-sm bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-1 border-b border-border">
              {(["today", "live", "all"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setJobsTab(tab)}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${jobsTab === tab ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}>
                  {tab === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {tab === "today" ? (tg("todaysJobs") || "Today's jobs") : tab === "live" ? (tg("live") || "Live") : (tg("allJobs") || "All jobs")}
                  <span className="text-xs">({tab === "today" ? filteredJobs.filter((j: any) => cd.todayIds.includes(j.publicId)).length : tab === "live" ? filteredJobs.filter((j: any) => (cd.liveIds || []).includes(j.publicId)).length : filteredJobs.length})</span>
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
              worker={workerFilter}
              onWorker={setWorkerFilter}
              workers={jobWorkers(jobs)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedJobs
                .map((job) => (
                  <ClientJobCard
                    key={job.id}
                    job={(cd.liveIds || []).includes((job as any).publicId) ? { ...job, status: "in_progress" } : job}
                    onViewDetails={() => router.push(`/jobs/${(job as any).publicId || job.id}/detail`)}
                    onViewRecords={() => handleViewAttendanceDetails(job)}
                    onAddManualAttendance={(j: any) => {
                      setManualAttendanceJob(j);
                      setShowManualAttendanceForm(true);
                    }}
                    showEnter={false}
                    recordsHref="/records/client"
                    onFillSurvey={handleClientFillSurvey}
                    surveyState={clientSurveyState(job)}
                  />
                ))}

              {displayedJobs.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p>{t("noActiveJobs") || "No jobs found"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <ListPanel title={tg("recentRequests") || "Recent requests"} actionLabel={tg("viewAll") || "View all"} onAction={() => router.push("/jobs/solicitudes")}>
          {(cd.recentRequests || []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">—</div>
          ) : (
            (cd.recentRequests).map((r: any) => (
              <ListRow
                key={r.id}
                avatar={<RowAvatar tone="brand">{(r.type || "?").charAt(0).toUpperCase()}</RowAvatar>}
                title={r.subject || "—"}
                subtitle={`${r.type === "new_job" ? (tg("newJob") || "New job") : r.type === "change" ? (tg("changeRequest") || "Change") : (tg("absence") || "Absence")} · ${formatLocalDate(r.createdAt)}`}
                right={
                  <StatusChip className={r.status === "accepted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : r.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}>
                    {tg(r.status) || r.status}
                  </StatusChip>
                }
              />
            ))
          )}
        </ListPanel>
      </div>

      {/* Manual Attendance Modal */}
      <ManualAttendanceRequestForm
        open={showManualAttendanceForm}
        onOpenChange={setShowManualAttendanceForm}
        job={manualAttendanceJob}
        mode="direct"
        onSuccess={() => {
          setShowManualAttendanceForm(false);
        }}
      />

      <SurveyFillDialog
        open={!!surveyDialog}
        entry={surveyDialog}
        title={tf("customerSurvey")}
        token={session?.accessToken || ""}
        onClose={() => setSurveyDialog(null)}
        onSubmitted={() => {
          if (surveyDialog) {
            setSurveyMap((m) => {
              const next = { ...m }
              for (const k of Object.keys(next)) {
                if (next[k]?.surveyPublicId === surveyDialog.surveyPublicId && next[k]) {
                  next[k] = { ...(next[k] as SurveyEntry), filled: true, canFill: false }
                }
              }
              return next
            })
          }
          setSurveyDialog(null)
        }}
      />
    </div>
  )
}
