// "use client"

// import { useState, useEffect } from "react"
// import {
//   Building,
//   Clock,
//   CheckCircle,
//   Eye,
//   MapPin,
//   Activity,
//   Timer,
//   Calendar,
//   Shield,
//   QrCode,
//   Wifi,
//   Navigation,
//   Camera,
//   Smartphone,
//   ClipboardList,
//   Search,
//   User,
//   ArrowLeft,
//   Star,
//   AlertCircle,
//   RefreshCw,
//   XCircle,
//   Pause,
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Card, CardContent, CardHeader } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { StatsCard } from "@/components/ui/stats-card"
// import { SurveyCard } from "@/components/ui/survey-card"
// import { useTranslation } from "@/hooks/use-translation"
// import { LoadingSpinner } from "@/components/dashboard-loader"
// import { useAuth } from "@/hooks/use-auth"
// import { JobAttendanceDetail } from "@/components/job-attendance-detail"

// interface ApiJob {
//   jobId: number
//   jobNo: string
//   jobName: string
//   clientName: string
//   workCenter: string
//   status: string
//   startDate: string // Now comes from API
//   endDate: string // Now comes from API
//   workers: Array<{
//     id: number
//     code: string
//     name: string
//   }>
//   shifts: Array<{
//     day: string
//     shiftType: "morning" | "afternoon" | "evening" | "noon"
//     startTime: string
//     endTime: string
//     totalHours: number
//     scheduleType: "fixed" | "flexible"
//   }>
//   tasks: Array<{
//     id: number
//     name: string
//     expectedDuration: number
//     isCompleted?: boolean
//     completedAt?: string
//     completedByWorkerId?: number
//   }>
//   workSession?: {
//     id: number
//     checkInTime: string
//     checkOutTime?: string
//     isOnBreak: boolean
//     currentBreakStart?: string
//     totalWorkMinutes: number
//     totalBreakMinutes: number
//   } | null
//   attendanceRecords?: Array<{
//     id: number
//     checkInTime: string
//     checkOutTime?: string
//     date: string
//   }>
// }

// interface Job {
//   id: number
//   jobId: string
//   title: string
//   description: string
//   worker: {
//     name: string
//     avatar: string
//     completedJobs: number
//   }
//   client: {
//     name: string
//     address: string
//     phone: string
//   }
//   schedule: {
//     date: string
//     startTime: string
//     endTime: string
//     estimatedHours: number
//     scheduleType: "fixed" | "flexible"
//   }
//   status: "scheduled" | "pending" | "in_progress" | "completed" | "cancelled" | "on_hold"
//   startDate: Date
//   endDate: Date
//   checkin?: {
//     time: string
//     method: string
//     location: { lat: number; lng: number; accuracy: string }
//     photo: boolean
//     ip: string
//     wifi: string
//   }
//   checkout?: {
//     time: string
//     method: string
//   }
//   timeTracking: {
//     breaks: Array<{ start: string; end: string; duration: number }>
//     activities: Array<{ time: string; action: string; location: string }>
//   }
//   qrCode: {
//     code: string
//     image?: string // Base64 image data
//     generatedAt: string
//     expiresAt: string
//   }
//   verificationMethods: string[]
//   geofence: {
//     enabled: boolean
//     radius: number
//     center: { lat: number; lng: number }
//   }
//   checklist: Array<{
//     id: number
//     task: string
//     completed: boolean
//     time?: string
//   }>
//   alerts: Array<{ type: string; message: string; time: string }>
//   feedback?: string
//   surveyCompleted?: boolean
//   clientSurvey?: {
//     rating: number
//     comments: string
//     submitted: boolean
//     submittedAt?: Date
//   }
//   isWorkerCheckedIn: boolean
//   hasAttendanceRecord: boolean
//   expectedHours: number
//   jobDurationDays: number
// }

// interface ClientStats {
//   totalJobs: number
//   activeJobs: number
//   completedJobs: number
//   satisfactionRate: number
//   responseTime: number
//   savings: number
// }

// export default function ClientDashboard() {
//   const { t } = useTranslation("dashboard") // Use dashboard translations
//   const { session } = useAuth()
//   const [currentTime, setCurrentTime] = useState(new Date())
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const [activeTab, setActiveTab] = useState("jobs")
//   const [searchTerm, setSearchTerm] = useState("")

//   // View state management
//   const [currentView, setCurrentView] = useState("dashboard")
//   const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null)
//   const [surveyJob, setSurveyJob] = useState<Job | null>(null)

//   const [clientStats, setClientStats] = useState<ClientStats>({
//     totalJobs: 0,
//     activeJobs: 0,
//     completedJobs: 0,
//     satisfactionRate: 92,
//     responseTime: 2.5,
//     savings: 8500,
//   })

//   const [jobs, setJobs] = useState<Job[]>([])

//   // Transform API data to Job interface
//   const transformApiJobToJob = (apiJob: ApiJob): Job => {
//     const currentDate = new Date()

//     // Parse start and end dates from API response (now guaranteed to exist)
//     const startDate = new Date(apiJob.startDate + "T00:00:00")
//     const endDate = new Date(apiJob.endDate + "T00:00:00")

//     // Calculate job duration in days
//     const jobDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

//     const firstShift = apiJob.shifts[0]
//     const isFlexible = !firstShift || firstShift.scheduleType === "flexible"

//     // Get primary worker (first worker in the array)
//     const primaryWorker = apiJob.workers[0] || { id: 0, code: "N/A", name: "Unassigned" }

//     const mockClient = {
//       name: apiJob.clientName,
//       address: `${apiJob.workCenter}, Building A`,
//       phone: "+1 (555) 123-4567",
//     }

//     // Check if there are any attendance records (check-in + check-out pairs)
//     const hasAttendanceRecord =
//       Boolean(
//         apiJob.attendanceRecords &&
//           apiJob.attendanceRecords.length > 0 &&
//           apiJob.attendanceRecords.some((record) => record.checkInTime && record.checkOutTime),
//       ) || Boolean(apiJob.workSession?.checkInTime && apiJob.workSession?.checkOutTime)

//     // Determine job status based on the new logic (same as worker dashboard)
//     let status: "scheduled" | "pending" | "in_progress" | "completed"

//     if (currentDate > endDate) {
//       // End date has passed
//       if (hasAttendanceRecord) {
//         status = "completed"
//       } else {
//         // End date passed but no attendance - still show as scheduled for potential late check-in
//         status = "scheduled"
//       }
//     } else {
//       // Before end date
//       if (hasAttendanceRecord || apiJob.workSession?.checkInTime) {
//         status = "in_progress"
//       } else {
//         status = "scheduled"
//       }
//     }

//     // Determine if worker has checked in based on actual status
//     const isWorkerCheckedIn = status === "in_progress" || status === "completed"

//     // Create checklist from tasks - only mark as completed if worker is checked in
//     const checklist = apiJob.tasks.map((task) => ({
//       id: task.id,
//       task: task.name,
//       completed: task.isCompleted || false,
//       time: task.completedAt
//         ? new Date(task.completedAt).toLocaleTimeString("en-US", {
//             hour: "2-digit",
//             minute: "2-digit",
//             hour12: true,
//           })
//         : undefined,
//     }))

//     // Calculate total expected duration from tasks or shifts
//     const totalExpectedDuration =
//       firstShift?.totalHours || apiJob.tasks.reduce((sum, task) => sum + (task.expectedDuration || 0), 0) || 8

//     return {
//       id: apiJob.jobId,
//       jobId: apiJob.jobNo || `JOB-${String(apiJob.jobId).padStart(3, "0")}`,
//       title: apiJob.jobName,
//       description: `${apiJob.jobName} at ${apiJob.workCenter}`,
//       worker: {
//         name: primaryWorker.name,
//         avatar: "👨‍💼",
//         completedJobs: Math.floor(Math.random() * 100) + 50,
//       },
//       client: mockClient,
//       schedule: {
//         date: startDate.toISOString().split("T")[0],
//         startTime: firstShift ? firstShift.startTime : "",
//         endTime: firstShift ? firstShift.endTime : "",
//         estimatedHours: totalExpectedDuration,
//         scheduleType: isFlexible ? "flexible" : "fixed",
//       },
//       status: status as "scheduled" | "pending" | "in_progress" | "completed" | "cancelled" | "on_hold",
//       startDate,
//       endDate,
//       timeTracking: {
//         breaks: [],
//         activities: [],
//       },
//       qrCode: {
//         code: `SECURE-JOB-${String(apiJob.jobId).padStart(3, "0")}-${Date.now()}`,
//         generatedAt: new Date().toISOString(),
//         expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
//       },
//       verificationMethods: ["qr-code", "wifi-network", "gps-location"],
//       geofence: {
//         enabled: true,
//         radius: 50,
//         center: { lat: 40.7128, lng: -74.006 },
//       },
//       checklist,
//       alerts: [],
//       isWorkerCheckedIn,
//       hasAttendanceRecord,
//       expectedHours: totalExpectedDuration,
//       jobDurationDays,
//     }
//   }

//   // Fetch jobs from API
//   const fetchJobs = async () => {
//     try {
//       setLoading(true)
//       setError(null)

//       const token = localStorage.getItem("clientToken") || session?.accessToken
//       if (!token) {
//         throw new Error("No authentication token found")
//       }

//       const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
//       const response = await fetch(`${baseUrl}/jobs/client/all-jobs`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       })

//       if (!response.ok) {
//         if (response.status === 401) {
//           throw new Error("Authentication failed. Please login again.")
//         } else if (response.status === 403) {
//           throw new Error("Access denied. You don't have permission to view jobs.")
//         } else if (response.status >= 500) {
//           throw new Error("Server error. Please try again later.")
//         } else {
//           throw new Error(`HTTP error! status: ${response.status}`)
//         }
//       }

//       const result = await response.json()

//       if (result.isSuccess && result.data) {
//         const transformedJobs = result.data.map(transformApiJobToJob)
//         setJobs(transformedJobs)

//         // Update stats based on real data
//         const totalJobs = transformedJobs.length
//         const activeJobs = transformedJobs.filter(
//           (job: Job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress",
//         ).length
//         const completedJobs = transformedJobs.filter((job: Job) => job.status === "completed").length

//         setClientStats((prev) => ({
//           ...prev,
//           totalJobs,
//           activeJobs,
//           completedJobs,
//         }))
//       } else {
//         throw new Error(result.message || "Failed to fetch jobs")
//       }
//     } catch (error) {
//       console.error("Error fetching jobs:", error)
//       setError(error instanceof Error ? error.message : "Failed to fetch jobs")
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Retry function
//   const handleRetry = () => {
//     fetchJobs()
//   }

//   useEffect(() => {
//     fetchJobs()
//   }, [])

//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date())
//     }, 1000)
//     return () => clearInterval(timer)
//   }, [])

//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString("en-US", {
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: true,
//     })
//   }

//   const formatDateOnly = (date: Date) => {
//     return date.toLocaleDateString("en-US", {
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     })
//   }

//   const formatDateRange = (startDate: Date, endDate: Date) => {
//     const start = formatDateOnly(startDate)
//     const end = formatDateOnly(endDate)

//     // If same date, show only once
//     if (start === end) {
//       return start
//     }

//     return `${start} - ${end}`
//   }

//   const getStatusConfig = (status: string) => {
//     switch (status) {
//       case "in_progress":
//         return {
//           color:
//             "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
//           icon: Activity,
//           dot: "bg-green-500",
//         }
//       case "scheduled":
//         return {
//           color:
//             "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
//           icon: Calendar,
//           dot: "bg-blue-500",
//         }
//       case "pending":
//         return {
//           color:
//             "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
//           icon: Clock,
//           dot: "bg-yellow-500",
//         }
//       case "completed":
//         return {
//           color:
//             "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
//           icon: CheckCircle,
//           dot: "bg-purple-500",
//         }
//       case "cancelled":
//         return {
//           color:
//             "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
//           icon: XCircle,
//           dot: "bg-red-500",
//         }
//       case "on_hold":
//         return {
//           color:
//             "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
//           icon: Pause,
//           dot: "bg-orange-500",
//         }
//       default:
//         return {
//           color:
//             "bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
//           icon: Clock,
//           dot: "bg-gray-500",
//         }
//     }
//   }

//   const getVerificationIcon = (method: string) => {
//     switch (method) {
//       case "qr-code":
//         return { icon: QrCode, name: "QR Code Scan", color: "text-purple-600 dark:text-purple-400" }
//       case "gps-location":
//         return { icon: Navigation, name: "GPS Geofencing", color: "text-green-600 dark:text-green-400" }
//       case "wifi-network":
//         return { icon: Wifi, name: "WiFi Detection", color: "text-blue-600 dark:text-blue-400" }
//       case "ip-address":
//         return { icon: Smartphone, name: "IP Verification", color: "text-orange-600 dark:text-orange-400" }
//       case "photo-verification":
//         return { icon: Camera, name: "Photo Capture", color: "text-pink-600 dark:text-pink-400" }
//       default:
//         return { icon: Shield, name: method, color: "text-gray-600 dark:text-gray-400" }
//     }
//   }

//   // Remove progress calculation - not needed
//   const calculateProgress = (job: Job) => {
//     return 0 // Always return 0 since we don't need progress
//   }

//   // Generate QR code using the QRCode library (same as qr-scanner.tsx)
//   const generateQRCodeFromData = async (qrData: any): Promise<string> => {
//     console.log("🎯 generateQRCodeFromData called with:", qrData)

//     try {
//       // Import QRCode library (same approach as qr-scanner.tsx)
//       const QRCode = require("qrcode")

//       // Convert data to JSON string
//       const dataString = JSON.stringify(qrData)
//       console.log("🎯 QR data string:", dataString)

//       // Generate QR code using the same method as qr-scanner.tsx
//       const qrCodeUrl = await QRCode.toDataURL(dataString, {
//         width: 256,
//         margin: 2,
//         color: {
//           dark: "#000000",
//           light: "#FFFFFF",
//         },
//       })

//       console.log("✅ QR code generated successfully with QRCode library")
//       console.log("✅ QR code URL length:", qrCodeUrl.length)

//       return qrCodeUrl
//     } catch (error) {
//       console.error("❌ Error in generateQRCodeFromData:", error)

//       // Fallback to simple SVG if QRCode library fails
//       const fallbackSVG = `
//       <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
//         <rect width="256" height="256" fill="white" stroke="#000" strokeWidth="2"/>
        
//          QR-like pattern 
//         <rect x="20" y="20" width="60" height="60" fill="none" stroke="black" strokeWidth="4"/>
//         <rect x="30" y="30" width="40" height="40" fill="black"/>
//         <rect x="40" y="40" width="20" height="20" fill="white"/>
        
//         <rect x="176" y="20" width="60" height="60" fill="none" stroke="black" strokeWidth="4"/>
//         <rect x="186" y="30" width="40" height="40" fill="black"/>
//         <rect x="196" y="40" width="20" height="20" fill="white"/>
        
//         <rect x="20" y="176" width="60" height="60" fill="none" stroke="black" strokeWidth="4"/>
//         <rect x="30" y="186" width="40" height="40" fill="black"/>
//         <rect x="40" y="196" width="20" height="20" fill="white"/>
        
//         <text x="128" y="130" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="black">
//           Job: ${qrData.jobId || "N/A"}
//         </text>
//         <text x="128" y="150" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="gray">
//           ${(qrData.jobName || "Unknown").substring(0, 20)}
//         </text>
//       </svg>
//     `

//       return "data:image/svg+xml;base64," + btoa(fallbackSVG)
//     }
//   }

//   const generateQRCode = async (jobId: number) => {
//     try {
//       console.log("🎯 Generating QR code for job ID:", jobId)
//       const token = localStorage.getItem("clientToken") || session?.accessToken
//       if (!token) {
//         throw new Error("No authentication token found")
//       }

//       const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
//       console.log("🎯 API Base URL:", baseUrl)

//       const response = await fetch(`${baseUrl}/jobs/generate-qr`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ jobId }),
//       })

//       console.log("🎯 QR API Response status:", response.status)

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`)
//       }

//       const result = await response.json()
//       console.log("🎯 QR API Result:", result)

//       if (result.qrData) {
//         // Generate QR code image from the data using QRCode library (async)
//         const qrImage = await generateQRCodeFromData(result.qrData)

//         const updatedJob = {
//           code: JSON.stringify(result.qrData),
//           image: qrImage,
//           generatedAt: new Date().toISOString(),
//           expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
//         }

//         console.log("✅ QR code generated successfully:", updatedJob.image.substring(0, 50) + "...")

//         setJobs((currentJobs) =>
//           currentJobs.map((job) =>
//             job.id === jobId
//               ? {
//                   ...job,
//                   qrCode: updatedJob,
//                 }
//               : job,
//           ),
//         )

//         // Also update selectedJobDetails if it's the same job
//         setSelectedJobDetails((current) =>
//           current?.id === jobId
//             ? {
//                 ...current,
//                 qrCode: updatedJob,
//               }
//             : current,
//         )
//       }
//     } catch (error) {
//       console.error("❌ Backend QR generation failed:", error)
//       console.log("🎯 Falling back to mock QR code generation")
//       // Call the mock QR code generator function
//       await generateMockQRCode(jobId)
//     }
//   }

//   const handleViewDetails = async (job: Job) => {
//     console.log("🎯 handleViewDetails called for job:", job.id)
//     setSelectedJobDetails(job)
//     setCurrentView("jobDetails")

//     // IMMEDIATELY generate QR code as soon as we set the selected job
//     console.log("🎯 IMMEDIATE QR generation for job:", job.id)

//     const immediateQRData = {
//       jobId: job.id,
//       jobName: job.title,
//       clientName: job.client.name,
//       timestamp: new Date().toISOString(),
//       token: `IMMEDIATE-${job.id}-${Date.now()}`,
//     }

//     console.log("🎯 Immediate QR data:", immediateQRData)

//     try {
//       // FIXED: Add await for async QR generation
//       const qrImage = await generateQRCodeFromData(immediateQRData)
//       console.log("🎯 QR image generated:", qrImage.substring(0, 50) + "...")

//       // Update the job with QR code IMMEDIATELY
//       const updatedJobWithQR = {
//         ...job,
//         qrCode: {
//           code: JSON.stringify(immediateQRData),
//           image: qrImage,
//           generatedAt: new Date().toISOString(),
//           expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
//         },
//       }

//       console.log("🎯 Setting selectedJobDetails with QR code...")
//       setSelectedJobDetails(updatedJobWithQR)

//       // Also update the jobs array
//       setJobs((currentJobs) => currentJobs.map((j) => (j.id === job.id ? updatedJobWithQR : j)))

//       console.log("✅ QR code set immediately! Should be visible now.")
//     } catch (error) {
//       console.error("❌ Immediate QR generation failed:", error)
//       // Set job details without QR code as fallback
//       setSelectedJobDetails(job)
//     }

//     // Then try backend generation in the background (optional enhancement)
//     try {
//       console.log("🎯 Trying backend QR generation in background...")
//       await generateQRCode(job.id)
//     } catch (error) {
//       console.log("⚠️ Backend QR failed, but immediate QR should be showing:", error)
//     }
//   }

//   // Add a mock QR code generator as fallback (using QRCode library like qr-scanner.tsx)
//   const generateMockQRCode = async (jobId: number) => {
//     try {
//       console.log("🎯 Generating mock QR code for job ID:", jobId)

//       const mockData = {
//         jobId: jobId,
//         type: "check-in",
//         timestamp: new Date().toISOString(),
//         code: `SECURE-JOB-${String(jobId).padStart(3, "0")}-${Date.now()}`,
//       }

//       // Generate QR code using the same library for consistency (async)
//       const qrImage = await generateQRCodeFromData(mockData)

//       const updatedJob = {
//         code: JSON.stringify(mockData),
//         image: qrImage,
//         generatedAt: new Date().toISOString(),
//         expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
//       }

//       console.log("✅ Mock QR code generated:", updatedJob.image.substring(0, 50) + "...")

//       setJobs((currentJobs) =>
//         currentJobs.map((job) =>
//           job.id === jobId
//             ? {
//                 ...job,
//                 qrCode: updatedJob,
//               }
//             : job,
//         ),
//       )

//       // Also update selectedJobDetails if it's the same job
//       setSelectedJobDetails((current) =>
//         current?.id === jobId
//           ? {
//               ...current,
//               qrCode: updatedJob,
//             }
//           : current,
//       )

//       console.log("✅ Mock QR code set successfully!")
//     } catch (error) {
//       console.error("❌ Failed to generate mock QR code:", error)
//     }
//   }

//   const handleFillSurvey = (job: Job) => {
//     setSurveyJob(job)
//     setCurrentView("survey")
//   }

//   const handleClientSurveySubmit = (rating: number, comments: string) => {
//     if (!surveyJob) return

//     const newSurvey = {
//       rating,
//       comments,
//       submitted: true,
//       submittedAt: new Date(),
//     }

//     setJobs((prev) => prev.map((job) => (job.id === surveyJob.id ? { ...job, clientSurvey: newSurvey } : job)))

//     // Reset survey form and go back to dashboard
//     setSurveyJob(null)
//     setCurrentView("dashboard")
//   }

//   const handleSurveyCancel = () => {
//     setSurveyJob(null)
//     setCurrentView("dashboard")
//   }

//   // Survey Full Page View
//   const renderSurveyView = () => {
//     if (!surveyJob) return null

//     return (
//       <SurveyCard job={surveyJob} onSubmit={handleClientSurveySubmit} onCancel={handleSurveyCancel} isFullPage={true} />
//     )
//   }

//   // Loading state
//   if (loading) {
//     return <LoadingSpinner />
//   }

//   // Error state
//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
//         <Card className="max-w-md w-full mx-4">
//           <CardContent className="p-6 text-center">
//             <div className="text-red-500 mb-4">
//               <AlertCircle className="w-12 h-12 mx-auto" />
//             </div>
//             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("errorLoadingJobs")}</h3>
//             <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
//             <div className="flex gap-2">
//               <Button onClick={handleRetry} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
//                 <RefreshCw className="w-4 h-4 mr-2" />
//                 {t("tryAgain")}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     )
//   }

//   // Transform Job to JobAssignment for JobAttendanceDetail component
//   const transformJobToJobAssignment = (job: Job) => {
//     return {
//       id: job.id,
//       jobId: job.jobId,
//       title: job.title,
//       client: {
//         id: 1, // Mock client ID
//         name: job.client.name,
//       },
//       workCenter: {
//         id: 1, // Mock work center ID
//         name: job.client.address.split(",")[0] || job.client.address,
//         address: job.client.address,
//         coordinates: { lat: 40.7128, lng: -74.006 }, // Mock coordinates
//       },
//       shift: {
//         type: "morning" as const,
//         startTime: job.schedule.startTime,
//         endTime: job.schedule.endTime,
//         duration: `${job.expectedHours}h`,
//         scheduleType: job.schedule.scheduleType as "fixed" | "flexible",
//       },
//       status: job.status as "scheduled" | "in_progress" | "completed",
//       startDate: job.startDate,
//       endDate: job.endDate,
//       signingMethods: {
//         qrCode: job.verificationMethods.includes("qr-code"),
//         gps: job.verificationMethods.includes("gps-location"),
//         wifi: job.verificationMethods.includes("wifi-network"),
//         ip: job.verificationMethods.includes("ip-address"),
//         callerId: false,
//       },
//       tasks: job.checklist.map((item) => ({
//         id: item.id,
//         name: item.task,
//         description: item.task,
//         completed: item.completed,
//         duration: "1h", // Mock duration
//         timing: "during" as const,
//       })),
//       checkInTime: job.checkin ? new Date(job.checkin.time) : undefined,
//       checkOutTime: job.checkout ? new Date(job.checkout.time) : undefined,
//       breakTime: 0, // Mock break time
//       workedTime: 0, // Mock worked time
//       expectedHours: job.expectedHours,
//       totalHours: job.expectedHours,
//       breakStartTime: undefined,
//       totalBreakTime: 0,
//       isOnBreak: false,
//       tags: [], // Mock tags
//       hasAttendanceRecord: job.hasAttendanceRecord,
//       survey: job.clientSurvey
//         ? {
//             rating: job.clientSurvey.rating,
//             comments: job.clientSurvey.comments,
//             submitted: job.clientSurvey.submitted,
//             submittedAt: job.clientSurvey.submittedAt,
//           }
//         : undefined,
//     }
//   }

//   const handleViewAttendanceDetails = (job: Job) => {
//     const jobAssignment = transformJobToJobAssignment(job)
//     setSelectedJobDetails(job)
//     setCurrentView("attendanceDetails")
//   }

//   // Job Details View - Full Page
//   const renderJobDetailsView = () => (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
//       <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
//         <div className="flex items-center gap-3">
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={() => setCurrentView("dashboard")}
//             className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
//           >
//             <ArrowLeft className="w-5 h-5" />
//           </Button>
//           <div>
//             <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("viewDetails")}</h1>
//             <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedJobDetails?.title}</p>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-[1400px] mx-auto p-4 space-y-4">
//         <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
//           <CardContent className="p-4">
//             <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{selectedJobDetails?.title}</h3>
//             <div className="space-y-2">
//               <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
//                 <MapPin className="w-4 h-4" />
//                 <span className="text-sm">{selectedJobDetails?.client.address}</span>
//               </div>
//               {selectedJobDetails?.schedule.scheduleType === "fixed" && (
//                 <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
//                   <Clock className="w-4 h-4" />
//                   <span className="text-sm">
//                     {selectedJobDetails?.schedule.startTime} - {selectedJobDetails?.schedule.endTime}
//                   </span>
//                 </div>
//               )}
//               <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
//                 <Building className="w-4 h-4" />
//                 <span className="text-sm">{selectedJobDetails?.client.name}</span>
//               </div>
//               <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
//                 <User className="w-4 h-4" />
//                 <span className="text-sm">
//                   {t("worker")}: {selectedJobDetails?.worker.name}
//                 </span>
//               </div>
//               <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
//                 <Calendar className="w-4 h-4" />
//                 <span className="text-sm">
//                   {selectedJobDetails && formatDateRange(selectedJobDetails.startDate, selectedJobDetails.endDate)}
//                   {selectedJobDetails && selectedJobDetails.jobDurationDays > 1 && (
//                     <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
//                       {selectedJobDetails.jobDurationDays}{" "}
//                       {selectedJobDetails.jobDurationDays === 1 ? t("day") : t("days")}
//                     </span>
//                   )}
//                 </span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* QR Code Section - Simple and Clean */}
//         <div>
//           <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("generateQR")}</h2>
//           <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
//             <CardContent className="p-6">
//               <div className="text-center">
//                 {selectedJobDetails?.qrCode.image ? (
//                   <div>
//                     <img
//                       src={selectedJobDetails.qrCode.image || "/placeholder.svg"}
//                       alt="Job QR Code"
//                       className="w-64 h-64 mx-auto mb-4 border border-gray-200 rounded"
//                     />
//                     <p className="text-sm text-gray-600 dark:text-gray-400">
//                       {t("worker")} scans this code to {t("checkIn")}/{t("checkOut")}
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="w-64 h-64 mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
//                     <div className="text-center">
//                       <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
//                       <p className="text-sm text-gray-500">Generating QR Code...</p>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Verification Methods */}
//         <div>
//           <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Security Verification Methods</h2>
//           <div className="space-y-3">
//             {selectedJobDetails &&
//               selectedJobDetails.verificationMethods.map((method) => {
//                 const verification = getVerificationIcon(method)
//                 const VerificationIcon = verification.icon

//                 return (
//                   <Card key={method} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
//                     <CardContent className="p-4">
//                       <div className="flex items-center gap-4">
//                         <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
//                           <VerificationIcon className="w-5 h-5" />
//                         </div>
//                         <div className="flex-1">
//                           <h3 className="font-semibold text-gray-900 dark:text-white">{verification.name}</h3>
//                           <p className="text-sm text-gray-600 dark:text-gray-400">
//                             {method === "gps-location" && "Verify worker location using GPS coordinates"}
//                             {method === "wifi-network" && "Detect connection to workplace WiFi network"}
//                             {method === "ip-address" && "Verify using IP address range"}
//                             {method === "qr-code" && "Scan QR code at designated location"}
//                             {method === "photo-verification" && "Capture photo for visual confirmation"}
//                           </p>
//                         </div>
//                         <Badge
//                           variant="secondary"
//                           className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
//                         >
//                           ENABLED
//                         </Badge>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )
//               })}
//           </div>
//         </div>

//         {/* Task Checklist */}
//         <div>
//           <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
//             Task Checklist ({selectedJobDetails && selectedJobDetails.checklist.filter((t) => t.completed).length}/
//             {selectedJobDetails?.checklist.length})
//           </h2>
//           <div className="space-y-3">
//             {selectedJobDetails &&
//               selectedJobDetails.checklist.map((task, index) => (
//                 <Card
//                   key={index}
//                   className={`border ${
//                     task.completed
//                       ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
//                       : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
//                   }`}
//                 >
//                   <CardContent className="p-4">
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center">
//                         <div
//                           className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
//                             task.completed ? "bg-green-500" : "bg-gray-400"
//                           }`}
//                         >
//                           {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
//                         </div>
//                         <div>
//                           <span
//                             className={`text-sm font-medium ${
//                               task.completed ? "text-green-800 dark:text-green-200" : "text-gray-900 dark:text-white"
//                             }`}
//                           >
//                             {task.task}
//                           </span>
//                           {task.completed && task.time && (
//                             <p className="text-xs text-green-600 dark:text-green-400 mt-1">
//                               {t("completed")} at {task.time}
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                       {task.completed && (
//                         <Badge
//                           variant="secondary"
//                           className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
//                         >
//                           DONE
//                         </Badge>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//           </div>
//         </div>

//         {/* Time Tracking Summary */}
//         {selectedJobDetails && (
//           <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
//             <CardContent className="p-4">
//               <div className="flex items-start gap-3">
//                 <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
//                 <div>
//                   <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Time Summary</h4>
//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
//                     <div>
//                       <span className="text-blue-800 dark:text-blue-200 font-medium">{t("expectedHours")}:</span>
//                       <p className="text-blue-900 dark:text-blue-100">
//                         {selectedJobDetails.expectedHours}
//                         {t("hour")}
//                       </p>
//                     </div>
//                     <div>
//                       <span className="text-blue-800 dark:text-blue-200 font-medium">{t("duration")}:</span>
//                       <p className="text-blue-900 dark:text-blue-100">
//                         {selectedJobDetails.jobDurationDays}{" "}
//                         {selectedJobDetails.jobDurationDays !== 1 ? t("days") : t("day")}
//                       </p>
//                     </div>
//                     <div>
//                       <span className="text-blue-800 dark:text-blue-200 font-medium">{t("status")}:</span>
//                       <p className="text-blue-900 dark:text-blue-100 capitalize">
//                         {t(selectedJobDetails.status.replace("_", ""))}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Action Buttons */}
//         <div className="flex gap-2 pt-1">
//           <Button
//             size="sm"
//             className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
//             onClick={() => handleViewDetails(selectedJobDetails)}
//           >
//             <QrCode className="w-3 h-3 mr-1" />
//             {t("scanQR")}
//           </Button>
//           <Button
//             size="sm"
//             variant="outline"
//             className="flex-1 h-7 text-xs bg-transparent border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
//             onClick={() => handleViewAttendanceDetails(selectedJobDetails)}
//           >
//             <Eye className="w-3 h-3 mr-1" />
//             {t("viewDetails")}
//           </Button>
//         </div>
//       </div>
//     </div>
//   )

//   // Render attendance details view
//   if (currentView === "attendanceDetails" && selectedJobDetails) {
//     const jobAssignment = transformJobToJobAssignment(selectedJobDetails)
//     return <JobAttendanceDetail job={jobAssignment} onBack={() => setCurrentView("dashboard")} />
//   }

//   // Render different views based on current state
//   if (currentView === "jobDetails") {
//     return renderJobDetailsView()
//   }

//   if (currentView === "survey") {
//     return renderSurveyView()
//   }

//   // Filter jobs based on search term
//   const filteredJobs = jobs.filter(
//     (job) =>
//       searchTerm === "" ||
//       job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       job.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       job.jobId.toLowerCase().includes(searchTerm.toLowerCase()),
//   )

//   // Main Dashboard View
//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
//       <div className="max-w-[1400px] mx-auto p-4 space-y-4">
//         {/* Header */}
//         <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
//           <CardContent className="p-4">
//             <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
//                   <User className="w-5 h-5 text-white" />
//                 </div>
//                 <div>
//                   <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("clientDashboard")}</h1>
//                   <p className="text-gray-600 dark:text-gray-400 text-sm">
//                     {formatTime(currentTime)} •{" "}
//                     {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-3">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                   <Input
//                     placeholder={t("searchJobs")}
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="pl-9 w-64 h-9"
//                   />
//                 </div>
//                 <Button
//                   onClick={handleRetry}
//                   variant="outline"
//                   size="sm"
//                   className="h-9 px-3 bg-transparent"
//                   disabled={loading}
//                 >
//                   <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Stats Cards - Removed Total Spent */}
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
//           <StatsCard
//             label={t("activeJobs").toUpperCase()}
//             value={clientStats.activeJobs}
//             icon={Activity}
//             color="gray-500"
//           />
//           <StatsCard
//             label={t("completedJobs").toUpperCase()}
//             value={clientStats.completedJobs}
//             icon={CheckCircle}
//             color="gray-500"
//           />
//           <StatsCard
//             label={t("averageRating").toUpperCase()}
//             value={`${clientStats.satisfactionRate}%`}
//             icon={Star}
//             color="gray-500"
//           />
//         </div>

//         {/* Main Content Tabs */}
//         <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
//           <CardContent className="p-4">
//             {/* Custom Tab Navigation */}
//             <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
//               <button
//                 onClick={() => setActiveTab("jobs")}
//                 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
//                   activeTab === "jobs"
//                     ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
//                     : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
//                 }`}
//               >
//                 {t("jobs")} (
//                 {
//                   jobs.filter(
//                     (job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress",
//                   ).length
//                 }
//                 )
//               </button>
//               <button
//                 onClick={() => setActiveTab("history")}
//                 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
//                   activeTab === "history"
//                     ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
//                     : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
//                 }`}
//               >
//                 History (
//                 {
//                   jobs.filter(
//                     (job) => job.status === "completed" || job.status === "cancelled" || job.status === "on_hold",
//                   ).length
//                 }
//                 )
//               </button>
//               <button
//                 onClick={() => setActiveTab("surveys")}
//                 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
//                   activeTab === "surveys"
//                     ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
//                     : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
//                 }`}
//               >
//                 {t("surveys")} ({jobs.filter((job) => job.clientSurvey?.submitted).length})
//               </button>
//             </div>

//             {/* Tab Content */}
//             {activeTab === "jobs" && (
//               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
//                 {filteredJobs
//                   .filter(
//                     (job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress",
//                   )
//                   .map((job) => {
//                     const statusConfig = getStatusConfig(job.status)
//                     const StatusIcon = statusConfig.icon

//                     return (
//                       <Card
//                         key={job.id}
//                         className="group border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-white dark:bg-gray-900"
//                       >
//                         {/* Status Indicator Line */}
//                         <div
//                           className={`w-full h-0.5 ${
//                             job.status === "pending"
//                               ? "bg-yellow-500"
//                               : job.status === "scheduled"
//                                 ? "bg-blue-500"
//                                 : job.status === "in_progress"
//                                   ? "bg-green-500"
//                                   : job.status === "completed"
//                                     ? "bg-purple-500"
//                                     : job.status === "cancelled"
//                                       ? "bg-red-500"
//                                       : job.status === "on_hold"
//                                         ? "bg-orange-500"
//                                         : "bg-gray-500"
//                           }`}
//                         ></div>
//                         <CardHeader className="pb-2">
//                           <div className="flex items-start justify-between">
//                             <div className="space-y-1">
//                               <div className="flex items-center gap-2">
//                                 <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
//                                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
//                               </div>
//                               <div className="flex items-center gap-2">
//                                 <Badge
//                                   variant="outline"
//                                   className="text-xs font-mono bg-gray-100 dark:bg-gray-800 h-5 border-gray-200 dark:border-gray-700"
//                                 >
//                                   {job.jobId}
//                                 </Badge>
//                                 <Badge className={`${statusConfig.color} flex items-center gap-1 h-6 text-xs`}>
//                                   <StatusIcon className="w-3 h-3" />
//                                   {job.status === "in_progress"
//                                     ? t("inProgress")
//                                     : job.status === "pending"
//                                       ? t("pending")
//                                       : job.status === "scheduled"
//                                         ? t("scheduled")
//                                         : job.status === "on_hold"
//                                           ? t("onHold")
//                                           : t(job.status)}
//                                 </Badge>
//                               </div>
//                             </div>
//                           </div>
//                         </CardHeader>

//                         <CardContent className="space-y-3 pt-0">
//                           {/* Worker & Location Info */}
//                           <div className="grid grid-cols-2 gap-3">
//                             <div className="space-y-1">
//                               <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
//                                 <User className="w-3 h-3" />
//                                 <span className="text-xs font-medium uppercase tracking-wide">{t("worker")}</span>
//                               </div>
//                               <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
//                                 {job.worker.name}
//                               </div>
//                             </div>
//                             <div className="space-y-1">
//                               <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
//                                 <MapPin className="w-3 h-3" />
//                                 <span className="text-xs font-medium uppercase tracking-wide">{t("location")}</span>
//                               </div>
//                               <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
//                                 {job.client.address}
//                               </div>
//                             </div>
//                           </div>

//                           {/* Job Duration - Updated to use real dates from API */}
//                           <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
//                             <div className="flex items-center justify-between">
//                               <div className="flex items-center gap-2">
//                                 <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
//                                 <div className="flex flex-col">
//                                   <span className="text-sm font-medium text-gray-900 dark:text-white">
//                                     {formatDateRange(job.startDate, job.endDate)}
//                                   </span>
//                                   <span className="text-xs text-gray-500 dark:text-gray-400">
//                                     {t("duration")}: {job.jobDurationDays}{" "}
//                                     {job.jobDurationDays !== 1 ? t("days") : t("day")}
//                                   </span>
//                                 </div>
//                               </div>
//                               <Badge
//                                 variant="secondary"
//                                 className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
//                               >
//                                 {job.expectedHours}
//                                 {t("hour")}
//                               </Badge>
//                             </div>
//                           </div>

//                           {/* Shift Time - Only show for fixed schedule */}
//                           {job.schedule.scheduleType === "fixed" && job.schedule.startTime && job.schedule.endTime && (
//                             <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
//                               <div className="flex items-center justify-between">
//                                 <div className="flex items-center gap-2">
//                                   <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
//                                   <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
//                                     {job.schedule.startTime} - {job.schedule.endTime}
//                                   </span>
//                                 </div>
//                                 <Badge
//                                   variant="secondary"
//                                   className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
//                                 >
//                                   {t("fixedSchedule")}
//                                 </Badge>
//                               </div>
//                             </div>
//                           )}

//                           {/* Flexible Schedule Indicator */}
//                           {job.schedule.scheduleType === "flexible" && (
//                             <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
//                               <div className="flex items-center justify-center">
//                                 <div className="flex items-center gap-2">
//                                   <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
//                                   <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
//                                     {t("flexibleSchedule")}
//                                   </span>
//                                 </div>
//                               </div>
//                             </div>
//                           )}

//                           {/* Hours Information - Only show expected hours */}
//                           <div className="grid grid-cols-1 gap-2">
//                             <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
//                               <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
//                                 {t("expectedHours")}
//                               </div>
//                               <div className="text-xs font-bold text-gray-900 dark:text-white">
//                                 {job.expectedHours}
//                                 {t("hour")}
//                               </div>
//                             </div>
//                           </div>

//                           {/* Action Buttons */}
//                           <div className="flex gap-2 pt-1">
//                             <Button
//                               size="sm"
//                               className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
//                               onClick={() => handleViewDetails(job)}
//                             >
//                               <QrCode className="w-3 h-3 mr-1" />
//                               {t("scanQR")}
//                             </Button>
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               className="flex-1 h-7 text-xs bg-transparent border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
//                               onClick={() => handleViewAttendanceDetails(job)}
//                             >
//                               <Eye className="w-3 h-3 mr-1" />
//                               {t("viewDetails")}
//                             </Button>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     )
//                   })}

//                 {filteredJobs.filter(
//                   (job) => job.status === "scheduled" || job.status === "pending" || job.status === "in_progress",
//                 ).length === 0 && (
//                   <div className="col-span-full">
//                     <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
//                       <CardContent className="p-8 text-center">
//                         <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                         <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
//                           {t("activeJobs")}
//                         </h3>
//                         <p className="text-gray-600 dark:text-gray-400 text-sm">
//                           {searchTerm ? "No jobs match your search criteria." : t("noJobsCreated")}
//                         </p>
//                       </CardContent>
//                     </Card>
//                   </div>
//                 )}
//               </div>
//             )}

//             {activeTab === "history" && (
//               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
//                 {filteredJobs
//                   .filter((job) => job.status === "completed" || job.status === "cancelled" || job.status === "on_hold")
//                   .map((job) => {
//                     const statusConfig = getStatusConfig(job.status)
//                     const StatusIcon = statusConfig.icon

//                     return (
//                       <Card
//                         key={job.id}
//                         className="border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900"
//                       >
//                         <CardHeader className="pb-3">
//                           <div className="flex items-start justify-between">
//                             <div className="space-y-1">
//                               <div className="flex items-center gap-2">
//                                 <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
//                                 <h3 className="text-base font-semibold text-gray-900 dark:text-white">{job.title}</h3>
//                               </div>
//                               <div className="flex items-center gap-2">
//                                 <Badge
//                                   variant="outline"
//                                   className="text-xs font-mono bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
//                                 >
//                                   {job.jobId}
//                                 </Badge>
//                                 <Badge className={`${statusConfig.color} flex items-center gap-1 text-xs font-medium`}>
//                                   <StatusIcon className="w-3 h-3" />
//                                   {t("completed")}
//                                 </Badge>
//                               </div>
//                             </div>
//                           </div>
//                         </CardHeader>

//                         <CardContent className="space-y-3">
//                           <div className="space-y-2">
//                             <div className="flex items-center gap-2">
//                               <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
//                               <span className="text-sm text-gray-600 dark:text-gray-400">
//                                 {formatDateRange(job.startDate, job.endDate)}
//                                 {job.jobDurationDays > 1 && (
//                                   <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
//                                     {job.jobDurationDays} {job.jobDurationDays === 1 ? t("day") : t("days")}
//                                   </span>
//                                 )}
//                               </span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <Timer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
//                               <span className="text-sm text-gray-600 dark:text-gray-400">
//                                 {job.expectedHours}
//                                 {t("hour")} {t("completed")}
//                               </span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
//                               <span className="text-sm text-gray-600 dark:text-gray-400">
//                                 {t("worker")}: {job.worker.name}
//                               </span>
//                             </div>
//                           </div>

//                           {/* Survey Status */}
//                           {job.clientSurvey?.submitted && (
//                             <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
//                               <div className="flex items-center gap-2 mb-2">
//                                 <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
//                                 <span className="text-sm font-medium text-green-700 dark:text-green-400">
//                                   {t("surveyCompleted")}
//                                 </span>
//                               </div>
//                               <div className="flex items-center gap-2 mb-2">
//                                 <span className="text-sm text-green-600 dark:text-green-400">{t("rating")}:</span>
//                                 <div className="flex gap-1">
//                                   {[1, 2, 3, 4, 5].map((star) => (
//                                     <Star
//                                       key={star}
//                                       className={`w-3 h-3 ${
//                                         star <= (job.clientSurvey?.rating || 0)
//                                           ? "text-yellow-500 fill-current"
//                                           : "text-gray-300 dark:text-gray-600"
//                                       }`}
//                                     />
//                                   ))}
//                                 </div>
//                                 <span className="text-sm font-medium text-green-700 dark:text-green-400">
//                                   {job.clientSurvey.rating}/5
//                                 </span>
//                               </div>
//                               {job.clientSurvey.comments && (
//                                 <p className="text-sm text-green-700 dark:text-green-400 italic">
//                                   "{job.clientSurvey.comments}"
//                                 </p>
//                               )}
//                             </div>
//                           )}

//                           <div className="flex gap-2 pt-1">
//                             <Button
//                               size="sm"
//                               className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
//                               onClick={() => handleViewDetails(job)}
//                             >
//                               <QrCode className="w-3 h-3 mr-1" />
//                               {t("scanQR")}
//                             </Button>
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               className="flex-1 h-7 text-xs bg-transparent border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
//                               onClick={() => handleViewAttendanceDetails(job)}
//                             >
//                               <Eye className="w-3 h-3 mr-1" />
//                               {t("viewDetails")}
//                             </Button>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     )
//                   })}

//                 {filteredJobs.filter(
//                   (job) => job.status === "completed" || job.status === "cancelled" || job.status === "on_hold",
//                 ).length === 0 && (
//                   <div className="col-span-full">
//                     <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
//                       <CardContent className="p-8 text-center">
//                         <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                         <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
//                           {t("completedJobs")}
//                         </h3>
//                         <p className="text-gray-600 dark:text-gray-400 text-sm">
//                           {searchTerm
//                             ? "No completed jobs match your search criteria."
//                             : "You don't have any completed jobs yet."}
//                         </p>
//                       </CardContent>
//                     </Card>
//                   </div>
//                 )}
//               </div>
//             )}

//             {activeTab === "surveys" && (
//               <div className="space-y-4">
//                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
//                   <ClipboardList className="w-5 h-5" />
//                   {t("surveys")}
//                 </h3>

//                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
//                   {jobs
//                     .filter((job) => job.clientSurvey?.submitted)
//                     .map((job) => (
//                       <SurveyCard key={job.id} job={job} onSubmit={() => {}} onCancel={() => {}} isFullPage={false} />
//                     ))}
//                 </div>

//                 {jobs.filter((job) => job.clientSurvey?.submitted).length === 0 && (
//                   <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
//                     <CardContent className="p-8 text-center">
//                       <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                       <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
//                         {t("noSurveysYet")}
//                       </h3>
//                       <p className="text-gray-600 dark:text-gray-400 text-sm">{t("surveysDescription")}</p>
//                     </CardContent>
//                   </Card>
//                 )}
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }
