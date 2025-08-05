"use client"

import { useState, useEffect } from "react"
import {
  Building,
  Clock,
  CheckCircle,
  Eye,
  MapPin,
  Activity,
  Timer,
  Calendar,
  Shield,
  QrCode,
  Wifi,
  Navigation,
  Camera,
  Smartphone,
  ClipboardList,
  Search,
  User,
  ArrowLeft,
  MessageSquare,
  Star,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatsCard } from "@/components/ui/stats-card"
import { SurveyCard } from "@/components/ui/survey-card"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { QRCodeGenerator } from "@/components/qr-code-generator"

type ApiJobStatus = "scheduled" | "pending" | "in_progress" | "completed" | "cancelled" | "on_hold"

interface ApiJob {
  jobId: number
  jobNo: string
  jobName: string
  clientName: string
  workCenter: string
  status: ApiJobStatus
  workers: Array<{
    id: number
    code: string
    name: string
  }>
  shifts: Array<{
    day: string
    shiftType: "morning" | "afternoon" | "evening" | "noon"
    startTime: string
    endTime: string
    totalHours: number
    scheduleType: "fixed" | "flexible"
  }>
  tasks: Array<{
    id: number
    name: string
    expectedDuration: number
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
  status: "pending" | "active" | "completed"
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
    actualHours: number
    breaks: Array<{ start: string; end: string; duration: number }>
    activities: Array<{ time: string; action: string; location: string }>
  }
  qrCode: {
    code: string
    generatedAt: string
    expiresAt: string
  }
  verificationMethods: string[]
  geofence: {
    enabled: boolean
    radius: number
    center: { lat: number; lng: number }
  }
  checklist: Array<{ task: string; completed: boolean; time?: string }>
  alerts: Array<{ type: string; message: string; time: string }>
  feedback?: string
  surveyCompleted?: boolean
  clientSurvey?: {
    rating: number
    comments: string
    submitted: boolean
    submittedAt?: Date
  }
  isWorkerCheckedIn: boolean // New field to track if worker has checked in today
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
  const { t } = useTranslation()
  const { session } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("jobs")
  const [searchTerm, setSearchTerm] = useState("")

  // View state management
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

  // Transform API data to Job interface
  const transformApiJobToJob = (apiJob: ApiJob): Job => {
    const firstShift = apiJob.shifts[0]
    const isFlexible = !firstShift || firstShift.scheduleType === "flexible"

    // Get primary worker (first worker in the array)
    const primaryWorker = apiJob.workers[0] || { id: 0, code: "N/A", name: "Unassigned" }

    const mockClient = {
      name: apiJob.clientName,
      address: `${apiJob.workCenter}, Building A`,
      phone: "+1 (555) 123-4567",
    }

    // Map database status to frontend status
    const mapApiStatusToFrontendStatus = (apiStatus: ApiJobStatus): "pending" | "active" | "completed" => {
      switch (apiStatus) {
        case "scheduled":
          return "pending"
        case "pending":
          return "pending"
        case "in_progress":
          return "active"
        case "completed":
          return "completed"
        case "cancelled":
          return "completed" // Treat cancelled as completed for UI purposes
        case "on_hold":
          return "pending" // Treat on_hold as pending for UI purposes
        default:
          return "pending"
      }
    }

    const status = mapApiStatusToFrontendStatus(apiJob.status)

    // Determine if worker has checked in based on status
    const isWorkerCheckedIn = status === "active" || status === "completed"

    // Create checklist from tasks - mark as completed based on status
    const checklist = apiJob.tasks.map((task, index) => ({
      task: task.name,
      completed: status === "completed" ? true : (status === "active" ? Math.random() > 0.5 : false),
      time: (status === "completed" || (status === "active" && Math.random() > 0.5)) ? "10:30 AM" : undefined,
    }))

    // Calculate total expected duration from tasks
    const totalExpectedDuration = apiJob.tasks.reduce((sum, task) => sum + task.expectedDuration, 0)

    return {
      id: apiJob.jobId,
      jobId: apiJob.jobNo,
      title: apiJob.jobName,
      description: `${apiJob.jobName} at ${apiJob.workCenter}`,
      worker: {
        name: primaryWorker.name,
        avatar: "👨‍💼",
        completedJobs: Math.floor(Math.random() * 100) + 50,
      },
      client: mockClient,
      schedule: {
        date: new Date().toISOString().split("T")[0],
        startTime: firstShift ? firstShift.startTime : "",
        endTime: firstShift ? firstShift.endTime : "",
        estimatedHours: totalExpectedDuration,
        scheduleType: isFlexible ? "flexible" : "fixed",
      },
      status,
      timeTracking: {
        actualHours: status === "completed" ? totalExpectedDuration + Math.random() * 2 : 0,
        breaks: [],
        activities: [],
      },
      qrCode: {
        code: `SECURE-JOB-${String(apiJob.jobId).padStart(3, "0")}-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      },
      verificationMethods: ["qr-code", "wifi-network", "gps-location"], // Keep for job details view
      geofence: {
        enabled: true,
        radius: 50,
        center: { lat: 40.7128, lng: -74.006 },
      },
      checklist,
      alerts: [],
      isWorkerCheckedIn,
    }
  }

  // Fetch jobs from API - Following employer dashboard pattern
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

        // Update stats based on real data
        const totalJobs = transformedJobs.length
        const activeJobs = transformedJobs.filter((job) => job.status === "active").length
        const completedJobs = transformedJobs.filter((job) => job.status === "completed").length

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

  // Retry function
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color:
            "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
          icon: Activity,
          dot: "bg-green-500",
        }
      case "pending":
        return {
          color:
            "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
          icon: Clock,
          dot: "bg-red-500",
        }
      case "completed":
        return {
          color:
            "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
          icon: CheckCircle,
          dot: "bg-purple-500",
        }
      default:
        return {
          color:
            "bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
          icon: Clock,
          dot: "bg-gray-500",
        }
    }
  }

  // Get display text for job status
  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case "active":
        return "In Progress"
      case "pending":
        return "Scheduled"
      case "completed":
        return "Completed"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getVerificationIcon = (method: string) => {
    switch (method) {
      case "qr-code":
        return { icon: QrCode, name: "QR Code Scan", color: "text-purple-600 dark:text-purple-400" }
      case "gps-location":
        return { icon: Navigation, name: "GPS Geofencing", color: "text-green-600 dark:text-green-400" }
      case "wifi-network":
        return { icon: Wifi, name: "WiFi Detection", color: "text-blue-600 dark:text-blue-400" }
      case "ip-address":
        return { icon: Smartphone, name: "IP Verification", color: "text-orange-600 dark:text-orange-400" }
      case "photo-verification":
        return { icon: Camera, name: "Photo Capture", color: "text-pink-600 dark:text-pink-400" }
      default:
        return { icon: Shield, name: method, color: "text-gray-600 dark:text-gray-400" }
    }
  }

  const calculateProgress = (job: Job) => {
    // If worker hasn't checked in, progress is 0
    if (!job.isWorkerCheckedIn) {
      return 0
    }

    // If worker is checked in, calculate based on completed tasks
    if (job.checklist.length === 0) return 0
    const completed = job.checklist.filter((item) => item.completed).length
    return Math.round((completed / job.checklist.length) * 100)
  }

  const handleViewDetails = (job: Job) => {
    setSelectedJobDetails(job)
    setCurrentView("jobDetails")
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

    // Reset survey form and go back to dashboard
    setSurveyJob(null)
    setCurrentView("dashboard")
  }

  const handleSurveyCancel = () => {
    setSurveyJob(null)
    setCurrentView("dashboard")
  }

  // Survey Full Page View
  const renderSurveyView = () => {
    if (!surveyJob) return null

    return (
      <SurveyCard job={surveyJob} onSubmit={handleClientSurveySubmit} onCancel={handleSurveyCancel} isFullPage={true} />
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 rounded-full animate-spin border-t-purple-600"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading your jobs...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Jobs</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRetry} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Job Details View - Full Page
  const renderJobDetailsView = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("dashboard")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Details</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedJobDetails?.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{selectedJobDetails?.title}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{selectedJobDetails?.client.address}</span>
              </div>
              {selectedJobDetails?.schedule.scheduleType === "fixed" && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedJobDetails?.schedule.startTime} - {selectedJobDetails?.schedule.endTime}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Building className="w-4 h-4" />
                <span className="text-sm">{selectedJobDetails?.client.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span className="text-sm">Worker: {selectedJobDetails?.worker.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job QR Code</h2>
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <CardContent className="p-4">
              {selectedJobDetails && (
                <QRCodeGenerator
                  jobId={selectedJobDetails.id}
                  jobTitle={selectedJobDetails.title}
                  onRefresh={() => {
                    // Optionally refresh job data or show a success message
                    console.log('QR Code refreshed for job:', selectedJobDetails.id)
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verification Methods */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Security Verification Methods</h2>
          <div className="space-y-3">
            {selectedJobDetails &&
              selectedJobDetails.verificationMethods.map((method) => {
                const verification = getVerificationIcon(method)
                const VerificationIcon = verification.icon

                return (
                  <Card key={method} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <VerificationIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{verification.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {method === "gps-location" && "Verify worker location using GPS coordinates"}
                            {method === "wifi-network" && "Detect connection to workplace WiFi network"}
                            {method === "ip-address" && "Verify using IP address range"}
                            {method === "qr-code" && "Scan QR code at designated location"}
                            {method === "photo-verification" && "Capture photo for visual confirmation"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        >
                          ENABLED
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>

        {/* Task Checklist */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Task Checklist ({selectedJobDetails && selectedJobDetails.checklist.filter((t) => t.completed).length}/
            {selectedJobDetails?.checklist.length})
          </h2>
          <div className="space-y-3">
            {selectedJobDetails &&
              selectedJobDetails.checklist.map((task, index) => (
                <Card
                  key={index}
                  className={`border ${
                    task.completed
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                            task.completed ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              task.completed ? "text-green-800 dark:text-green-200" : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {task.task}
                          </span>
                          {task.completed && task.time && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Completed at {task.time}</p>
                          )}
                        </div>
                      </div>
                      {task.completed && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        >
                          DONE
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Time Tracking Summary */}
        {selectedJobDetails && (
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Time Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-800 dark:text-blue-200 font-medium">Expected:</span>
                      <p className="text-blue-900 dark:text-blue-100">{selectedJobDetails.schedule.estimatedHours}h</p>
                    </div>
                    <div>
                      <span className="text-blue-800 dark:text-blue-200 font-medium">Actual:</span>
                      <p className="text-blue-900 dark:text-blue-100">
                        {selectedJobDetails.status === "completed"
                          ? `${selectedJobDetails.timeTracking.actualHours.toFixed(1)}h`
                          : selectedJobDetails.status === "active"
                            ? "In Progress"
                            : "Not Started"}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-800 dark:text-blue-200 font-medium">Breaks:</span>
                      <p className="text-blue-900 dark:text-blue-100">
                        {selectedJobDetails.timeTracking.breaks.length} breaks
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-800 dark:text-blue-200 font-medium">Status:</span>
                      <p className="text-blue-900 dark:text-blue-100 capitalize">{selectedJobDetails.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1 bg-transparent">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Worker
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            <Calendar className="w-4 h-4 mr-2" />
            Reschedule Job
          </Button>
          {selectedJobDetails && !selectedJobDetails.clientSurvey?.submitted && (
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => handleFillSurvey(selectedJobDetails)}
            >
              <Star className="w-4 h-4 mr-2" />
              Fill Survey
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  // Render different views based on current state
  if (currentView === "jobDetails") {
    return renderJobDetailsView()
  }

  if (currentView === "survey") {
    return renderSurveyView()
  }

  // Filter jobs based on search term
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Dashboard</h1>
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
                    placeholder="Search jobs..."
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

        {/* Stats Cards - Removed Total Spent */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
          <StatsCard label="ACTIVE JOBS" value={clientStats.activeJobs} icon={Activity} color="gray-500" />
          <StatsCard label="COMPLETED JOBS" value={clientStats.completedJobs} icon={CheckCircle} color="gray-500" />
          <StatsCard
            label="SATISFACTION RATE"
            value={`${clientStats.satisfactionRate}%`}
            icon={Star}
            color="gray-500"
          />
        </div>

        {/* Main Content Tabs */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            {/* Custom Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => setActiveTab("jobs")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "jobs"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Jobs ({jobs.filter((job) => job.status === "pending" || job.status === "active").length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                History ({jobs.filter((job) => job.status === "completed").length})
              </button>
              <button
                onClick={() => setActiveTab("surveys")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "surveys"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Surveys ({jobs.filter((job) => job.clientSurvey?.submitted).length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "jobs" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredJobs
                  .filter((job) => job.status === "pending" || job.status === "active")
                  .map((job) => {
                    const statusConfig = getStatusConfig(job.status)
                    const progress = calculateProgress(job)
                    const StatusIcon = statusConfig.icon

                    return (
                      <Card
                        key={job.id}
                        className="group border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-white dark:bg-gray-900"
                      >
                        {/* Status Indicator Line */}
                        <div
                          className={`w-full h-0.5 ${
                            job.status === "pending"
                              ? "bg-red-500"
                              : job.status === "active"
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
                                <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono bg-gray-100 dark:bg-gray-800 h-5 border-gray-200 dark:border-gray-700"
                                >
                                  {job.jobId}
                                </Badge>
                                <Badge className={`${statusConfig.color} flex items-center gap-1 h-6 text-xs`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {getStatusDisplayText(job.status)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pt-0">
                          {/* Worker & Location Info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <User className="w-3 h-3" />
                                <span className="text-xs font-medium uppercase tracking-wide">Worker</span>
                              </div>
                              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {job.worker.name}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span className="text-xs font-medium uppercase tracking-wide">Location</span>
                              </div>
                              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {job.client.address}
                              </div>
                            </div>
                          </div>

                          {/* Shift Time - Only show for fixed schedule */}
                          {job.schedule.scheduleType === "fixed" && job.schedule.startTime && job.schedule.endTime && (
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {job.schedule.startTime} - {job.schedule.endTime}
                                  </span>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                  {job.schedule.estimatedHours}h
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Flexible Schedule Indicator - Changed to gray color */}
                          {job.schedule.scheduleType === "flexible" && (
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Flexible Schedule
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Hours Information - Only show actual hours if completed */}
                          <div className="grid grid-cols-2 gap-2">
                            {job.schedule.scheduleType === "fixed" && (
                              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
                                  Expected Hours
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                  {job.schedule.estimatedHours}h
                                </div>
                              </div>
                            )}
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
                                Actual Hours
                              </div>
                              <div className="text-xs font-bold text-gray-900 dark:text-white">
                                {job.status === "completed"
                                  ? `${job.timeTracking.actualHours.toFixed(1)}h`
                                  : job.status === "active"
                                    ? "In Progress"
                                    : "---"}
                              </div>
                            </div>
                          </div>

                          {/* Tasks Progress - Updated logic */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Tasks Progress
                              </span>
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                {job.checklist.filter((t) => t.completed).length}/{job.checklist.length}
                              </span>
                            </div>
                            <div className="relative">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                            {!job.isWorkerCheckedIn && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                Progress will show after worker checks in
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => handleViewDetails(job)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                            {!job.clientSurvey?.submitted && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-transparent border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                onClick={() => handleFillSurvey(job)}
                              >
                                <Star className="w-3 h-3 mr-1" />
                                Fill Survey
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                {filteredJobs.filter((job) => job.status === "pending" || job.status === "active").length === 0 && (
                  <div className="col-span-full">
                    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                      <CardContent className="p-8 text-center">
                        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">No Active Jobs</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {searchTerm
                            ? "No jobs match your search criteria."
                            : "You don't have any active jobs right now."}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredJobs
                  .filter((job) => job.status === "completed")
                  .map((job) => {
                    const statusConfig = getStatusConfig(job.status)
                    const StatusIcon = statusConfig.icon

                    return (
                      <Card
                        key={job.id}
                        className="border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                >
                                  {job.jobId}
                                </Badge>
                                <Badge className={`${statusConfig.color} flex items-center gap-1 text-xs font-medium`}>
                                  <StatusIcon className="w-3 h-3" />
                                  Completed
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">{job.schedule.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {job.timeTracking.actualHours.toFixed(1)}h completed
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Worker: {job.worker.name}
                              </span>
                            </div>
                          </div>

                          {/* Survey Status */}
                          {job.clientSurvey?.submitted && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                  Survey Completed
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-green-600 dark:text-green-400">Rating:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= (job.clientSurvey?.rating || 0)
                                          ? "text-yellow-500 fill-current"
                                          : "text-gray-300 dark:text-gray-600"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                  {job.clientSurvey.rating}/5
                                </span>
                              </div>
                              {job.clientSurvey.comments && (
                                <p className="text-sm text-green-700 dark:text-green-400 italic">
                                  "{job.clientSurvey.comments}"
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => handleViewDetails(job)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                            {!job.clientSurvey?.submitted && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-transparent border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                onClick={() => handleFillSurvey(job)}
                              >
                                <Star className="w-3 h-3 mr-1" />
                                Fill Survey
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                {filteredJobs.filter((job) => job.status === "completed").length === 0 && (
                  <div className="col-span-full">
                    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                          No Completed Jobs
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {searchTerm
                            ? "No completed jobs match your search criteria."
                            : "You don't have any completed jobs yet."}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === "surveys" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  My Surveys
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {jobs
                    .filter((job) => job.clientSurvey?.submitted)
                    .map((job) => (
                      <SurveyCard key={job.id} job={job} onSubmit={() => {}} onCancel={() => {}} isFullPage={false} />
                    ))}
                </div>

                {jobs.filter((job) => job.clientSurvey?.submitted).length === 0 && (
                  <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                    <CardContent className="p-8 text-center">
                      <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">No Surveys Yet</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Your completed surveys will appear here after you submit them.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
