"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle, Timer, Target, CheckSquare, User, MapPin, Navigation, ClipboardList, AlertCircle } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { StatsCard } from "@/components/ui/stats-card"
import { JobCard } from "./job-card"
import { CurrentJobCard } from "./current-job-card"
import { SurveyCard } from "@/components/ui/survey-card"
import { CheckInMethods } from "@/components/dashboards/worker-dashboard/check-in-methods"
import { CheckInProcess } from "@/components/dashboards/worker-dashboard/check-in-process"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"

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
  status: string
  totalShifts: number
  expectedDuration: number
  startDate?: string
  endDate?: string
  tasks: Array<{
    id: number
    name: string
    note?: string
    expectedDuration?: number
    isCompleted: boolean
    completedAt?: string
    completedByWorkerId?: number
  }>
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

  // Job detail view state
  const [detailJob, setDetailJob] = useState<JobAssignment | null>(null)

  // Transform API job data to frontend job format
  const transformApiJobToJobAssignment = (apiJob: ApiWorkerJob): JobAssignment => {
    const currentDate = new Date()
    
    // Parse start and end dates from API response
    let startDate = new Date()
    let endDate = new Date()
    
    if (apiJob.startDate) {
      startDate = new Date(apiJob.startDate)
    }
    
    if (apiJob.endDate) {
      endDate = new Date(apiJob.endDate)
    } else {
      // If no end date provided, calculate based on expected duration
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + Math.ceil(apiJob.expectedDuration / 8)) // Assuming 8 hours per day
    }

    // Check if there are any attendance records (check-in + check-out pairs)
    const hasAttendanceRecord = Boolean(
      apiJob.attendanceRecords && 
      apiJob.attendanceRecords.length > 0 && 
      apiJob.attendanceRecords.some(record => record.checkInTime && record.checkOutTime)
    ) || Boolean(apiJob.workSession?.checkInTime && apiJob.workSession?.checkOutTime)

    // Determine job status based on the new logic
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
      qrCode: signingMethods.methodDetails.includes("qrcode") || signingMethods.methodDetails.includes("qr-code") || true,
      gps: signingMethods.methodDetails.includes("gps"),
      wifi: signingMethods.methodDetails.includes("wifi"),
      ip: signingMethods.methodDetails.includes("ip"),
      callerId: signingMethods.methodDetails.includes("caller"),
    }

    // Create tasks from API tasks
    const tasks = apiJob.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.note || `Complete ${task.name.toLowerCase()}`,
      completed: task.isCompleted,
      duration: task.expectedDuration ? `${task.expectedDuration} min` : "30 min",
      timing: "during" as const,
    }))

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
      startDate, // Use the actual start date from API
      endDate,   // Use the actual end date from API
      signingMethods: methods,
      tasks,
      checkInTime: apiJob.workSession?.checkInTime ? new Date(apiJob.workSession.checkInTime) : undefined,
      checkOutTime: apiJob.workSession?.checkOutTime ? new Date(apiJob.workSession.checkOutTime) : undefined,
      breakTime: apiJob.workSession?.totalBreakMinutes || 0,
      workedTime: apiJob.workSession?.totalWorkMinutes || 0,
      expectedHours: firstShift?.totalHours || apiJob.expectedDuration,
      totalHours: status === "completed" ? firstShift?.totalHours || apiJob.expectedDuration : undefined,
      totalBreakTime: apiJob.workSession?.totalBreakMinutes || 0,
      isOnBreak: apiJob.workSession?.isOnBreak || false,
      breakStartTime: apiJob.workSession?.currentBreakStart ? new Date(apiJob.workSession.currentBreakStart) : undefined,
      tags: apiJob.tasks.slice(0, 2).map(task => task.name),
      hasAttendanceRecord,
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

        // Set current job - only jobs that are in_progress and currently active
        let newCurrentJob = transformedJobs.find((job) => {
          return job.status === "in_progress" && 
                 job.checkInTime && 
                 !job.checkOutTime && 
                 new Date() <= job.endDate
        })

        // If no active current job, keep existing one if still valid
        if (!newCurrentJob && currentJob) {
          const existingCurrentJob = transformedJobs.find((job) => job.id === currentJob.id)
          if (existingCurrentJob && existingCurrentJob.status === "in_progress" && existingCurrentJob.checkInTime && !existingCurrentJob.checkOutTime) {
            newCurrentJob = existingCurrentJob
          }
        }

        setCurrentJob(newCurrentJob || null)
        console.log('🎯 Current job set:', newCurrentJob ? `${newCurrentJob.title} (${newCurrentJob.status}, attendance: ${newCurrentJob.hasAttendanceRecord})` : 'None')

        // Update stats based on real data
        const completedJobs = transformedJobs.filter((job) => job.status === "completed").length
        const totalHours = transformedJobs
          .filter((job) => job.status === "completed")
          .reduce((sum, job) => sum + (job.totalHours || 0), 0)

        setWorkerStats({
          todayShifts: transformedJobs.length,
          completedJobs,
          totalHours,
          onTimeRate: 95,
          taskCompletionRate: 88,
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
    setSelectedJob(job)
    setCurrentView("checkInMethods")
  }

  const handleCheckOut = async (job: JobAssignment) => {
    try {
      setLoading(true)
      
      if (!session?.accessToken) {
        throw new Error('No access token found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          scanType: 'check-out',
          location: job.workCenter.name,
          notes: 'Work session completed',
        }),
      })

      const data = await response.json()
      console.log('✅ Check-out response:', data)

      if (response.ok) {
        const now = new Date()
        
        // Update job with checkout time and attendance record
        const updatedJob = {
          ...job,
          checkOutTime: now,
          hasAttendanceRecord: true, // Now has a complete attendance record
        }

        // Update local state immediately
        setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)))
        setCurrentJob(null)
        
        console.log('🎯 Job checked out, refreshing data to get updated status...')
        // Refresh job data to get latest status
        await fetchWorkerJobs()
      } else {
        throw new Error(data.message || 'Failed to check out')
      }
    } catch (error) {
      console.error('Error checking out:', error)
      setError(error instanceof Error ? error.message : 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (job: JobAssignment, taskId: number) => {
    try {
      setLoading(true)
      
      if (!session?.accessToken) {
        throw new Error('No access token found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        // Update the local state
        setTodayAssignments((prev) => 
          prev.map((j) => {
            if (j.id === job.id) {
              return {
                ...j,
                tasks: j.tasks.map((task) => 
                  task.id === taskId ? { ...task, completed: true } : task
                )
              }
            }
            return j
          })
        )

        // Also update current job if it exists
        if (currentJob?.id === job.id) {
          setCurrentJob({
            ...currentJob,
            tasks: currentJob.tasks.map((task) => 
              task.id === taskId ? { ...task, completed: true } : task
            )
          })
        }
      } else {
        throw new Error(data.message || 'Failed to complete task')
      }
    } catch (error) {
      console.error('Error completing task:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete task')
    } finally {
      setLoading(false)
    }
  }

  const handleTakeBreak = async (job: JobAssignment, breakType: string) => {
    try {
      setLoading(true)
      
      if (!session?.accessToken) {
        throw new Error('No access token found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          scanType: 'break-start',
          location: job.workCenter.name,
          notes: `Break started: ${breakType}`,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const now = new Date()
        const updatedJob = {
          ...job,
          status: "in_progress" as const,
          isOnBreak: true,
          breakStartTime: now,
        }

        setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)))
        setCurrentJob(updatedJob)
      } else {
        throw new Error(data.message || 'Failed to start break')
      }
    } catch (error) {
      console.error('Error starting break:', error)
      setError(error instanceof Error ? error.message : 'Failed to start break')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToWork = async (job: JobAssignment) => {
    try {
      setLoading(true)
      
      if (!session?.accessToken) {
        throw new Error('No access token found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          scanType: 'break-end',
          location: job.workCenter.name,
          notes: 'Break ended, back to work',
        }),
      })

      const data = await response.json()

      if (response.ok) {
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
      } else {
        throw new Error(data.message || 'Failed to end break')
      }
    } catch (error) {
      console.error('Error ending break:', error)
      setError(error instanceof Error ? error.message : 'Failed to end break')
    } finally {
      setLoading(false)
    }
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

    setSurveyJob(null)
    setCurrentView("dashboard")
  }

  const handleFillSurvey = (job: JobAssignment) => {
    setSurveyJob(job)
    setCurrentView("survey")
  }

  const handleViewDetail = (job: JobAssignment) => {
    setDetailJob(job)
    setCurrentView("jobDetail")
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

  const completeCheckIn = async () => {
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

      try {
        await fetchWorkerJobs()
        console.log('✅ Job data refreshed after check-in')
      } catch (error) {
        console.error('❌ Failed to refresh job data after check-in:', error)
      }
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
        token={session?.accessToken || ''}
        onBack={() => setCurrentView("checkInMethods")}
        onComplete={completeCheckIn}
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

  if (currentView === "jobDetail" && detailJob) {
    return (
      <JobAttendanceDetail
        job={detailJob}
        onBack={() => setCurrentView("dashboard")}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard label="TODAY'S SHIFTS" value={workerStats.todayShifts} icon={Calendar} />
          <StatsCard label="COMPLETED JOBS" value={workerStats.completedJobs} icon={CheckCircle} />
          <StatsCard label="HOURS TODAY" value={`${workerStats.totalHours}h`} icon={Timer} />
          <StatsCard label="ON-TIME RATE" value={`${workerStats.onTimeRate}%`} icon={Target} />
          <StatsCard label="TASK COMPLETION" value={`${workerStats.taskCompletionRate}%`} icon={CheckSquare} />
        </div>

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

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
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

            {activeTab === "assignments" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAssignments.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onFillSurvey={handleFillSurvey}
                    onCompleteTask={handleCompleteTask}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAssignments
                  .filter((job) => job.status === "completed")
                  .map((job) => (
                    <JobCard 
                      key={job.id} 
                      job={job} 
                      onFillSurvey={handleFillSurvey} 
                      onViewDetail={handleViewDetail}
                      showActions={true} 
                    />
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
    </div>
  )
}
