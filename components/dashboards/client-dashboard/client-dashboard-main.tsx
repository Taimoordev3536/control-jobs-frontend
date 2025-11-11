"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Activity, ClipboardList, Search, User, Star, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatsCard } from "@/components/ui/stats-card"
import { SurveyCard } from "@/components/ui/survey-card"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import { ClientJobCard } from "./client-job-card"

interface ApiJob {
  jobId: number
  jobNo: string
  jobName: string
  clientName: string
  workCenter?: string
  workCenters?: Array<{ id?: number; name?: string }>
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
  const { session } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Tabs removed: always show job cards directly
  const [searchTerm, setSearchTerm] = useState("")

  const [currentView, setCurrentView] = useState("dashboard")
  const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null)
  const [surveyJob, setSurveyJob] = useState<Job | null>(null)

  const [clientStats, setClientStats] = useState<ClientStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    satisfactionRate: 92,
    responseTime: 2.5,
    savings: 8500,
  })

  const [jobs, setJobs] = useState<Job[]>([])

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
          })
        : undefined,
    }))

    const totalExpectedDuration =
      typeof apiJob.expectedDuration === "number"
        ? apiJob.expectedDuration
        : (apiJob.tasks || []).reduce((sum, task) => sum + (task.expectedDuration || 0), 0) || 8

    return {
      id: apiJob.jobId,
      jobId: apiJob.jobNo || `JOB-${String(apiJob.jobId).padStart(3, "0")}`,
      title: apiJob.jobName,
      // keep original jobName for components expecting it
      jobName: apiJob.jobName,
      description: `${apiJob.jobName} at ${apiJob.workCenterNames || (apiJob as any).workCenter || ''}`,
      worker: {
        name: primaryWorker.name,
        avatar: "👨‍💼",
        completedJobs: Math.floor(Math.random() * 100) + 50,
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
          throw new Error("Authentication failed. Please login again.")
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
    fetchJobs()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

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
    setCurrentView("jobDetails")

    console.log("🎯 IMMEDIATE QR generation for job:", job.id)

    const immediateQRData = {
      jobId: job.id,
      jobName: job.title,
      clientName: job.client.name,
      timestamp: new Date().toISOString(),
      token: `IMMEDIATE-${job.id}-${Date.now()}`,
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

  const handleFillSurvey = (job: Job) => {
    setSurveyJob(job)
    setCurrentView("survey")
  }

  const handleClientSurveySubmit = (rating: number, comments: string) => {
    if (!surveyJob) return

    const newSurvey = {
      rating,
      comments,
      submitted: true,
      submittedAt: new Date(),
    }

    setJobs((prev) => prev.map((job) => (job.id === surveyJob.id ? { ...job, clientSurvey: newSurvey } : job)))

    setSurveyJob(null)
    setCurrentView("dashboard")
  }

  const handleSurveyCancel = () => {
    setSurveyJob(null)
    setCurrentView("dashboard")
  }

  const renderSurveyView = () => {
    if (!surveyJob) return null

    return (
      <SurveyCard job={surveyJob} onSubmit={handleClientSurveySubmit} onCancel={handleSurveyCancel} isFullPage={true} />
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
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
      survey: job.clientSurvey
        ? {
            rating: job.clientSurvey.rating,
            comments: job.clientSurvey.comments,
            submitted: job.clientSurvey.submitted,
            submittedAt: job.clientSurvey.submittedAt,
          }
        : undefined,
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

  const filteredJobs = jobs.filter(
    (job) =>
      searchTerm === "" ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("clientDashboard")}</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatTime(currentTime)} •{" "}
                    {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t("searchJobs")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 h-9"
                  />
                </div>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 bg-transparent"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
          <StatsCard
            label={t("activeJobs").toUpperCase()}
            value={clientStats.activeJobs}
            icon={Activity}
            color="gray-500"
          />
          <StatsCard
            label={t("completedJobs").toUpperCase()}
            value={clientStats.completedJobs}
            icon={CheckCircle}
            color="gray-500"
          />
          <StatsCard
            label={t("averageRating").toUpperCase()}
            value={`${clientStats.satisfactionRate}%`}
            icon={Star}
            color="gray-500"
          />
        </div>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            {/* Direct job cards view (tabs removed) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJobs
                .filter((job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress")
                .map((job) => (
                  <ClientJobCard
                    key={job.id}
                    job={job}
                    onViewDetails={() => handleViewDetails(job)}
                    onViewRecords={() => handleViewAttendanceDetails(job)}
                  />
                ))}

              {filteredJobs.filter(
                (job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress",
              ).length === 0 && (
                <div className="col-span-full">
                  <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                    <CardContent className="p-8 text-center">
                      <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{t("activeJobs")}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {searchTerm ? "No jobs match your search criteria." : t("noJobsCreated")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
