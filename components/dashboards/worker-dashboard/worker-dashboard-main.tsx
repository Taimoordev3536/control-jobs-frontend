"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  CheckCircle,
  Timer,
  Target,
  CheckSquare,
  User,
  MapPin,
  Navigation,
  ClipboardList,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatsCard } from "@/components/ui/stats-card"
import { JobCard } from "./job-card"
import { CurrentJobCard } from "./current-job-card"
import { SurveyCard } from "@/components/ui/survey-card"
import { CheckInMethods } from "@/components/dashboards/worker-dashboard/check-in-methods"
import { CheckInProcess } from "@/components/dashboards/worker-dashboard/check-in-process"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { QRScanner } from "@/components/qr-scanner"

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
  status: "scheduled" | "in_progress" | "completed" | "missed" | "on_break"
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
  survey?: {
    rating: number
    comments: string
    submitted: boolean
    submittedAt?: Date
  }
}

interface WorkerStats {
  todayShifts: number
  completedJobs: number
  totalHours: number
  onTimeRate: number
  taskCompletionRate: number
}

interface LocationData {
  isAtWorkCenter: boolean
  distance: number
  accuracy: number
  wifiConnected: boolean
  wifiName?: string
  city?: string
  country?: string
}

interface ApiWorkerJob {
  jobId: number
  jobName: string
  clientName: string
  workCenter: string
  status: string // Add status field from backend
  totalShifts: number
  expectedDuration: number
  tasks: string[]
  shifts: Array<{
    shiftType: string
    startTime: string
    endTime: string
    totalHours: number
  }>
  signingMethods: Array<{
    methodType: string
    methodDetails: string[]
    verifyIdentity: boolean
  }>
}

interface ApiWorkerResponse {
  message: string
  data: ApiWorkerJob[]
  isSuccess: boolean
  statusCode: number
  developerError: string
}

export default function WorkerDashboardMain() {
  const { t } = useTranslation()
  const { session } = useAuth()

  const [todayAssignments, setTodayAssignments] = useState<JobAssignment[]>([])
  const [currentJob, setCurrentJob] = useState<JobAssignment | null>(null)
  const [workerStats, setWorkerStats] = useState<WorkerStats>({
    todayShifts: 3,
    completedJobs: 2,
    totalHours: 6.5,
    onTimeRate: 95,
    taskCompletionRate: 88,
  })
  const [locationData, setLocationData] = useState<LocationData>({
    isAtWorkCenter: false,
    distance: 0,
    accuracy: 0,
    wifiConnected: false,
    city: "San Francisco",
    country: "United States",
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("assignments")
  const [error, setError] = useState<string | null>(null)

  // Check-in flow states
  const [currentView, setCurrentView] = useState("dashboard")
  const [selectedJob, setSelectedJob] = useState<JobAssignment | null>(null)
  const [selectedCheckInMethod, setSelectedCheckInMethod] = useState("")

  // Survey states
  const [surveyJob, setSurveyJob] = useState<JobAssignment | null>(null)

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [selectedJobForScan, setSelectedJobForScan] = useState<JobAssignment | null>(null)

  // Transform API job data to frontend job format
  const transformApiJobToJobAssignment = (apiJob: ApiWorkerJob): JobAssignment => {
    // Map backend status to worker dashboard status
    const mapStatus = (backendStatus: string): "scheduled" | "in_progress" | "completed" | "missed" | "on_break" => {
      switch (backendStatus?.toLowerCase()) {
        case 'scheduled':
        case 'pending':
          return 'scheduled'
        case 'in_progress':
          return 'in_progress'
        case 'completed':
          return 'completed'
        case 'cancelled':
          return 'missed'
        case 'on_hold':
          return 'on_break'
        default:
          return 'scheduled'
      }
    }

    const status = mapStatus(apiJob.status)

    // Get the first shift for timing info, or create default
    const firstShift = apiJob.shifts[0]
    let shiftInfo
    if (firstShift) {
      shiftInfo = {
        type: firstShift.shiftType as "morning" | "afternoon" | "evening",
        startTime: firstShift.startTime,
        endTime: firstShift.endTime,
        duration: `${firstShift.totalHours} hours`,
        scheduleType: "fixed" as const,
      }
    } else {
      shiftInfo = {
        type: "morning" as const,
        duration: `${apiJob.expectedDuration} hours`,
        scheduleType: "flexible" as const,
      }
    }

    // Transform signing methods
    const signingMethods = apiJob.signingMethods[0] || { methodDetails: [], verifyIdentity: false }
    const methods = {
      qrCode: signingMethods.methodDetails.includes("qrcode"),
      gps: signingMethods.methodDetails.includes("gps"),
      wifi: signingMethods.methodDetails.includes("wifi"),
      ip: signingMethods.methodDetails.includes("ip"),
      callerId: signingMethods.methodDetails.includes("caller"),
    }

    // Create tasks from API tasks
    const tasks = apiJob.tasks.map((task, index) => ({
      id: index + 1,
      name: task,
      description: `Complete ${task.toLowerCase()}`,
      completed: status === "completed" ? true : Math.random() > 0.5,
      duration: "30 min",
      timing: "during" as const,
    }))

    // Generate dates
    const startDate = new Date()
    if (status === "completed") {
      startDate.setDate(startDate.getDate() - 1)
    }

    return {
      id: apiJob.jobId,
      jobId: `JOB-${apiJob.jobId.toString().padStart(4, "0")}`,
      title: apiJob.jobName,
      client: {
        id: Math.floor(Math.random() * 100) + 1,
        name: apiJob.clientName,
      },
      workCenter: {
        id: Math.floor(Math.random() * 10) + 1,
        name: apiJob.workCenter,
        address: `${apiJob.workCenter} Address`,
        coordinates: { lat: 37.4419, lng: -122.143 },
      },
      shift: shiftInfo,
      status,
      signingMethods: methods,
      tasks,
      checkInTime: status !== "scheduled" ? new Date(startDate.getTime() + Math.random() * 3600000) : undefined,
      checkOutTime: status === "completed" ? new Date(startDate.getTime() + 4 * 3600000) : undefined,
      breakTime: status === "completed" ? 15 : 0,
      workedTime: status === "completed" ? 240 : status === "in_progress" ? 120 : 0,
      expectedHours: firstShift?.totalHours || apiJob.expectedDuration,
      totalHours: status === "completed" ? firstShift?.totalHours || apiJob.expectedDuration : undefined,
      totalBreakTime: status === "completed" ? 15 : 0,
      isOnBreak: status === "on_break",
      tags: apiJob.tasks.slice(0, 2),
      survey:
        status === "completed"
          ? {
              rating: Math.floor(Math.random() * 2) + 4,
              comments: "Job completed successfully",
              submitted: Math.random() > 0.5,
              submittedAt: status === "completed" ? new Date() : undefined,
            }
          : undefined,
    }
  }

  // Replace the mock data fetching with real API call
  const fetchWorkerJobs = async () => {
    if (!session?.accessToken) {
      setError("No authentication token available")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/worker/all-jobs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiWorkerResponse = await response.json()

      if (data.isSuccess && data.data) {
        const transformedJobs = data.data.map(transformApiJobToJobAssignment)
        setTodayAssignments(transformedJobs)

        // Set current job to in-progress job
        const inProgressJob = transformedJobs.find((job) => job.status === "in_progress")
        setCurrentJob(inProgressJob || null)

        // Update stats based on real data
        const completedJobs = transformedJobs.filter((job) => job.status === "completed").length
        const totalHours = transformedJobs
          .filter((job) => job.status === "completed")
          .reduce((sum, job) => sum + (job.totalHours || 0), 0)

        setWorkerStats({
          todayShifts: transformedJobs.length,
          completedJobs,
          totalHours,
          onTimeRate: 95, // Static for now
          taskCompletionRate: 88, // Static for now
        })
      } else {
        throw new Error(data.developerError || data.message || "Failed to fetch worker jobs")
      }
    } catch (error) {
      console.error("Error fetching worker jobs:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch worker jobs")
      setTodayAssignments([])
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get status badge color and text
  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
      case 'pending':
        return { color: 'bg-blue-100 text-blue-800', text: 'Scheduled' }
      case 'in_progress':
        return { color: 'bg-yellow-100 text-yellow-800', text: 'In Progress' }
      case 'completed':
        return { color: 'bg-green-100 text-green-800', text: 'Completed' }
      case 'missed':
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', text: 'Missed' }
      case 'on_break':
      case 'on_hold':
        return { color: 'bg-gray-100 text-gray-800', text: 'On Break' }
      default:
        return { color: 'bg-gray-100 text-gray-800', text: 'Unknown' }
    }
  }

  // QR Code scan handling functions
  const handleQRScan = async (scannedData: string) => {
    try {
      setScannerLoading(true)
      
      // Parse QR code data
      let qrData
      try {
        qrData = JSON.parse(scannedData)
      } catch (e) {
        throw new Error('Invalid QR code format. Please scan a valid job QR code.')
      }

      // Validate QR code structure - Check for required backend format
      if (!qrData.jobId || !qrData.jobName || !qrData.timestamp) {
        throw new Error('Invalid job QR code. Missing required job information.')
      }

      const scannedJobId = parseInt(qrData.jobId)
      
      // Find the job in worker's assignments to validate access
      const assignedJob = todayAssignments.find(job => job.id === scannedJobId)
      if (!assignedJob) {
        throw new Error(`Job "${qrData.jobName}" is not assigned to you. Please contact your supervisor.`)
      }

      // Check if worker is scanning the correct job (if one was pre-selected)
      const jobToCheck = selectedJobForScan || selectedJob
      if (jobToCheck && scannedJobId !== jobToCheck.id) {
        throw new Error(`QR code is for "${qrData.jobName}" but you selected "${jobToCheck.title}". Please scan the correct QR code.`)
      }

      // Determine scan type based on current job status
      const currentStatus = assignedJob.status
      let scanType: 'check-in' | 'check-out'
      
      if (currentStatus === 'scheduled') {
        scanType = 'check-in'
      } else if (currentStatus === 'in_progress' || currentStatus === 'on_break') {
        scanType = 'check-out'
      } else {
        throw new Error(`Cannot scan QR code. Job "${assignedJob.title}" is already ${currentStatus}.`)
      }

      // Validate QR code timestamp (optional security check)
      const qrTimestamp = new Date(qrData.timestamp)
      const now = new Date()
      const hoursDiff = Math.abs(now.getTime() - qrTimestamp.getTime()) / (1000 * 60 * 60)
      if (hoursDiff > 24) {
        console.warn('QR code is older than 24 hours, but proceeding with scan')
      }

      // Call backend API to record the scan
      const token = localStorage.getItem("workerToken")
      if (!token) {
        throw new Error("Authentication required. Please log in again.")
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
      const response = await fetch(`${baseUrl}/jobs/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: scannedJobId,
          scanType: scanType,
          location: `QR Scan - ${qrData.workCenter || 'Unknown Location'}`,
          notes: `Scanned QR code for ${qrData.jobName} at ${new Date().toLocaleString()}`,
          qrCodeData: qrData // Include original QR data for audit trail
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.developerError || `Server error: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      const scanData = result.data || result
      
      // Update job status locally based on scan type
      const newStatus = scanType === 'check-in' ? 'in_progress' : 'completed'
      const updatedJob = {
        ...assignedJob,
        status: newStatus,
        checkInTime: scanType === 'check-in' ? new Date() : assignedJob.checkInTime,
        checkOutTime: scanType === 'check-out' ? new Date() : undefined
      }

      // Update the job in the assignments list
      setTodayAssignments(prev => 
        prev.map(job => 
          job.id === scannedJobId ? updatedJob : job
        )
      )
      
      // Set as current job if checking in
      if (scanType === 'check-in') {
        setCurrentJob(updatedJob)
        
        // Show success message with navigation prompt
        alert(`✅ Successfully checked in to "${assignedJob.title}"!\n\nYou can now see your current job details and manage tasks.`)
      } else {
        // Checking out - clear current job
        setCurrentJob(null)
        alert(`✅ Successfully checked out of "${assignedJob.title}"!\n\nJob completed. Thank you for your work!`)
      }

      // Close scanner and reset states
      setShowQRScanner(false)
      setSelectedJobForScan(null)
      
      // Navigate back to main dashboard view to show current job card
      setCurrentView("dashboard")
      setSelectedJob(null)
      setSelectedCheckInMethod("")
      
      // Refresh jobs data to get latest status from server
      fetchWorkerJobs()
      
    } catch (error) {
      console.error('QR scan error:', error)
      const errorMessage = error instanceof Error ? error.message : 'QR scan failed'
      setError(errorMessage)
      
      // Keep scanner open on error so user can try again
      // Don't close scanner or reset states on error
      
      // Re-throw the error so check-in process can handle it
      throw error
    } finally {
      setScannerLoading(false)
    }
  }

  const handleStartQRScan = (job: JobAssignment) => {
    setSelectedJobForScan(job)
    setShowQRScanner(true)
    setError(null)
  }

  const handleCloseQRScanner = () => {
    setShowQRScanner(false)
    setSelectedJobForScan(null)
    setScannerLoading(false)
  }

  // Update the useEffect to call the real API
  useEffect(() => {
    fetchWorkerJobs()
  }, [session?.accessToken])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Simulate location checking
  useEffect(() => {
    const checkLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Mock location verification
            setLocationData({
              isAtWorkCenter: true,
              distance: 15,
              accuracy: position.coords.accuracy,
              wifiConnected: true,
              wifiName: "TechSolutions_WiFi",
              city: "San Francisco",
              country: "United States",
            })
          },
          () => {
            setLocationData((prev) => ({
              ...prev,
              isAtWorkCenter: false,
              distance: 999,
              city: "San Francisco",
              country: "United States",
            }))
          },
        )
      }
    }

    checkLocation()
    const locationTimer = setInterval(checkLocation, 30000)
    return () => clearInterval(locationTimer)
  }, [])

  const handleCheckIn = (job: JobAssignment) => {
    // Always go to method selection first, regardless of available methods
    setSelectedJob(job)
    setCurrentView("checkInMethods")
  }

  const handleCheckOut = (job: JobAssignment) => {
    const now = new Date()
    const updatedJob = {
      ...job,
      status: "completed" as const,
      checkOutTime: now,
      totalHours: job.checkInTime
        ? Math.round(((now.getTime() - job.checkInTime.getTime()) / 1000 / 60 / 60 - job.totalBreakTime / 60) * 10) / 10
        : job.expectedHours,
    }

    setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)))
    setCurrentJob(null)
  }

  const handleTakeBreak = (job: JobAssignment, breakType: string) => {
    const now = new Date()
    const updatedJob = {
      ...job,
      status: "on_break" as const,
      isOnBreak: true,
      breakStartTime: now,
    }

    setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)))
    setCurrentJob(updatedJob)
  }

  const handleBackToWork = (job: JobAssignment) => {
    const now = new Date()
    const breakDuration = job.breakStartTime
      ? Math.floor((now.getTime() - job.breakStartTime.getTime()) / 1000 / 60)
      : 0

    const updatedJob = {
      ...job,
      status: "in_progress" as const,
      isOnBreak: false,
      totalBreakTime: job.totalBreakTime + breakDuration,
      breakStartTime: undefined,
    }

    setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)))
    setCurrentJob(updatedJob)
  }

  const handleCheckInMethodSelect = (method: string) => {
    setSelectedCheckInMethod(method)
    setCurrentView("checkInProcess")
  }

  const handleTaskToggle = (jobId: number, taskId: number) => {
    setTodayAssignments((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              tasks: job.tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
            }
          : job,
      ),
    )

    if (currentJob && currentJob.id === jobId) {
      setCurrentJob((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
            }
          : null,
      )
    }
  }

  const handleSurveySubmit = (rating: number, comments: string) => {
    if (!surveyJob) return

    const newSurvey = {
      rating,
      comments,
      submitted: true,
      submittedAt: new Date(),
    }

    setTodayAssignments((prev) => prev.map((job) => (job.id === surveyJob.id ? { ...job, survey: newSurvey } : job)))

    // Reset survey form and go back to dashboard
    setSurveyJob(null)
    setCurrentView("dashboard")
  }

  const handleFillSurvey = (job: JobAssignment) => {
    setSurveyJob(job)
    setCurrentView("survey")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const formatTimeShort = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getCurrentSessionTime = (job: JobAssignment) => {
    if (!job.checkInTime) return "00:00:00"

    const now = new Date()
    let totalWorkingSeconds = 0

    if (job.isOnBreak && job.breakStartTime) {
      totalWorkingSeconds = Math.floor((job.breakStartTime.getTime() - job.checkInTime.getTime()) / 1000)
    } else if (job.checkOutTime) {
      totalWorkingSeconds = Math.floor((job.checkOutTime.getTime() - job.checkInTime.getTime()) / 1000)
      totalWorkingSeconds -= job.totalBreakTime * 60
    } else {
      totalWorkingSeconds = Math.floor((now.getTime() - job.checkInTime.getTime()) / 1000)
      totalWorkingSeconds -= job.totalBreakTime * 60
    }

    // Ensure we don't show negative time
    totalWorkingSeconds = Math.max(0, totalWorkingSeconds)

    const hours = Math.floor(totalWorkingSeconds / 3600)
    const minutes = Math.floor((totalWorkingSeconds % 3600) / 60)
    const seconds = totalWorkingSeconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const getCurrentBreakTime = (job: JobAssignment) => {
    if (!job.isOnBreak || !job.breakStartTime) return "00:00:00"

    const now = new Date()
    const breakSeconds = Math.floor((now.getTime() - job.breakStartTime.getTime()) / 1000)

    const hours = Math.floor(breakSeconds / 3600)
    const minutes = Math.floor((breakSeconds % 3600) / 60)
    const seconds = breakSeconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const completeCheckIn = () => {
    if (selectedJob) {
      const now = new Date()
      const updatedJob = {
        ...selectedJob,
        status: "in_progress" as const,
        checkInTime: now,
      }

      setTodayAssignments((prev) => prev.map((j) => (j.id === selectedJob.id ? updatedJob : j)))
      setCurrentJob(updatedJob)
      setCurrentView("dashboard")
      setSelectedJob(null)
      setSelectedCheckInMethod("")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 rounded-full animate-spin border-t-purple-600"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
        </div>
      </div>
    )
  }

  // Add error display in the loading section
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="border border-red-200 dark:border-red-800 shadow-sm bg-white dark:bg-gray-900 max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("errorLoadingJobs") || "Error Loading Jobs"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{error}</p>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={fetchWorkerJobs}>
              {t("tryAgain") || "Try Again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render different views based on current state
  if (currentView === "checkInMethods" && selectedJob) {
    return (
      <CheckInMethods
        job={selectedJob}
        onBack={() => setCurrentView("dashboard")}
        onMethodSelect={handleCheckInMethodSelect}
      />
    )
  }

  if (currentView === "checkInProcess" && selectedJob) {
    return (
      <CheckInProcess
        job={selectedJob}
        method={selectedCheckInMethod}
        onBack={() => setCurrentView("checkInMethods")}
        onComplete={completeCheckIn}
        onQRScan={(data) => handleQRScan(data)}
      />
    )
  }

  if (currentView === "survey" && surveyJob) {
    return (
      <SurveyCard
        job={surveyJob}
        onSubmit={handleSurveySubmit}
        onCancel={() => setCurrentView("dashboard")}
        isFullPage={true}
      />
    )
  }

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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Worker Dashboard</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatTime(currentTime)} •{" "}
                    {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {locationData.isAtWorkCenter ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                    <Navigation className="w-4 h-4" />
                    <span className="text-sm font-medium">At Work Center</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{locationData.distance}m away</span>
                  </div>
                )}
                {locationData.city && locationData.country && (
                  <div className="flex items-center gap-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {locationData.city}, {locationData.country}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard label="TODAY'S SHIFTS" value={workerStats.todayShifts} icon={Calendar} />
          <StatsCard label="COMPLETED JOBS" value={workerStats.completedJobs} icon={CheckCircle} />
          <StatsCard label="HOURS TODAY" value={`${workerStats.totalHours}h`} icon={Timer} />
          <StatsCard label="ON-TIME RATE" value={`${workerStats.onTimeRate}%`} icon={Target} />
          <StatsCard label="TASK COMPLETION" value={`${workerStats.taskCompletionRate}%`} icon={CheckSquare} />
        </div>

        {/* Current Job Status */}
        {currentJob && (
          <CurrentJobCard
            job={currentJob}
            onCheckOut={handleCheckOut}
            onTakeBreak={handleTakeBreak}
            onBackToWork={handleBackToWork}
            onTaskToggle={handleTaskToggle}
            getCurrentSessionTime={getCurrentSessionTime}
            getCurrentBreakTime={getCurrentBreakTime}
            formatTimeShort={formatTimeShort}
          />
        )}

        {/* Main Content Tabs */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            {/* Custom Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => setActiveTab("assignments")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "assignments"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Today's Assignments
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Recent History
              </button>
              <button
                onClick={() => setActiveTab("surveys")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "surveys"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Surveys
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "assignments" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAssignments.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onFillSurvey={handleFillSurvey}
                  />
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAssignments
                  .filter((job) => job.status === "completed")
                  .map((job) => (
                    <JobCard key={job.id} job={job} onFillSurvey={handleFillSurvey} showActions={false} />
                  ))}
              </div>
            )}

            {activeTab === "surveys" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  My Surveys
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {todayAssignments
                    .filter((job) => job.survey?.submitted)
                    .map((job) => (
                      <SurveyCard key={job.id} job={job} onSubmit={() => {}} onCancel={() => {}} isFullPage={false} />
                    ))}
                </div>

                {todayAssignments.filter((job) => job.survey?.submitted).length === 0 && (
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

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onScan={handleQRScan}
        onClose={handleCloseQRScanner}
        loading={scannerLoading}
        title="Scan Job QR Code"
        subtitle={selectedJobForScan ? `Check ${selectedJobForScan.status === 'scheduled' ? 'in' : 'out'} for: ${selectedJobForScan.title}` : undefined}
      />
    </div>
  )
}
