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

interface ApiJob {
  jobId: number
  jobName: string
  clientName: string
  workCenter: string
  totalShifts: number
  expectedDuration: number
  tasks: string[]
  workers: Array<{
    id: number
    code: string
    name: string | null
  }>
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
  }
  workers: Array<{
    id: number
    name: string
    avatar?: string
  }>
  status: "in_progress" | "pending" | "completed"
  progress: number
  startDate: string
  endDate?: string
  duration: string
  shifts: number
  occupation: string
  tags: string[]
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
  const { t } = useTranslation()
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

  const occupations = ["Cleaning", "Security", "Maintenance", "Delivery", "IT Support", "Landscaping"]

  // Get unique work centers from jobs data
  const workCenters = Array.from(new Set(jobs.map((job) => job.workCenter.name))).filter(Boolean)

  // Transform API job data to frontend job format
  const transformApiJobToJob = (apiJob: ApiJob): Job => {
    // Generate status based on shifts - if no shifts, it's pending
    let status: "in_progress" | "pending" | "completed"
    let progress = 0

    if (apiJob.totalShifts === 0) {
      status = "pending"
      progress = 0
    } else if (apiJob.totalShifts > 0 && apiJob.totalShifts < 5) {
      status = "in_progress"
      progress = Math.min((apiJob.totalShifts / 5) * 100, 90) // Progress based on shifts
    } else {
      status = "completed"
      progress = 100
    }

    // Generate dates based on expected duration
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 7)) // Started within last week

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + apiJob.expectedDuration)

    // Infer occupation from tasks
    let occupation = "General"
    const taskString = apiJob.tasks.join(" ").toLowerCase()
    if (taskString.includes("clean") || taskString.includes("sweep")) {
      occupation = "Cleaning"
    } else if (taskString.includes("security") || taskString.includes("guard")) {
      occupation = "Security"
    } else if (taskString.includes("maintain") || taskString.includes("repair")) {
      occupation = "Maintenance"
    } else if (taskString.includes("deliver") || taskString.includes("transport")) {
      occupation = "Delivery"
    }

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
      },
      workers: apiJob.workers.map((worker) => ({
        id: worker.id,
        name: worker.name || `Worker ${worker.code}`, // Fallback to code if name is null
      })),
      status,
      progress,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      duration: `${apiJob.expectedDuration} ${apiJob.expectedDuration === 1 ? "day" : "days"}`,
      shifts: apiJob.totalShifts,
      occupation,
      tags: apiJob.tasks.slice(0, 3), // Use first 3 tasks as tags
    }
  }

  // Fetch jobs from API
  const fetchJobs = async () => {
    if (!session?.accessToken) {
      setError("No authentication token available")
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
        const pendingJobs = transformedJobs.filter((job) => job.status === "pending").length
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
          pendingJobs,
          completedJobs,
          totalRevenue: 2450000, // Static for now
          monthlyGrowth: 18.5, // Static for now
        })
      } else {
        throw new Error(data.developerError || data.message || "Failed to fetch jobs")
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch jobs")
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [session?.accessToken])

  const handleViewDetail = (jobId: number) => {
    router.push(`/jobs/${jobId}`)
  }

  const handleEditJob = (jobId: number) => {
    console.log("Edit job:", jobId)
  }

  const handleJobAdded = (newJob: any) => {
    // Refresh jobs list after adding a new job
    fetchJobs()
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
        }
      case "pending":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
          icon: Clock,
        }
      case "completed":
        return {
          color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
          icon: CheckCircle,
        }
      default:
        return {
          color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
          icon: AlertCircle,
        }
    }
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t("errorLoadingJobs") || "Error Loading Jobs"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{error}</p>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={fetchJobs}>
              {t("tryAgain") || "Try Again"}
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t("jobsManagement") || "Jobs Management"}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t("manageWorkforceAssignments") || "Manage workforce assignments"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t("searchJobs") || "Search jobs..."}
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
                  <span className="hidden sm:inline">{t("newJob") || "New Job"}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: t("totalJobs") || "Total Jobs",
              value: stats.totalJobs,
              icon: Briefcase,
            },
            {
              label: t("inProgressJobs") || "In Progress Jobs",
              value: stats.inProgressJobs,
              icon: Activity,
            },
            {
              label: t("pendingJobs") || "Pending Jobs",
              value: stats.pendingJobs,
              icon: Clock,
            },
            {
              label: t("completedJobs") || "Completed Jobs",
              value: stats.completedJobs,
              icon: CheckCircle,
            },
            {
              label: t("totalClients") || "Total Clients",
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
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("filters") || "Filters"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" />
                  {t("status") || "Status"}
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allStatuses") || "All Statuses"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allStatuses") || "All Statuses"}</SelectItem>
                    <SelectItem value="in_progress">{t("inProgress") || "In Progress"}</SelectItem>
                    <SelectItem value="pending">{t("pending") || "Pending"}</SelectItem>
                    <SelectItem value="completed">{t("completed") || "Completed"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {t("occupation") || "Occupation"}
                </label>
                <Select value={occupationFilter} onValueChange={setOccupationFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allOccupations") || "All Occupations"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allOccupations") || "All Occupations"}</SelectItem>
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
                  {t("workCenter") || "Work Center"}
                </label>
                <Select value={workCenterFilter} onValueChange={setWorkCenterFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allWorkCenters") || "All Centers"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allWorkCenters") || "All Work Centers"}</SelectItem>
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
                  {t("dateRange") || "Date Range"}
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t("allDates") || "All Dates"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all">{t("allDates") || "All Dates"}</SelectItem>
                    <SelectItem value="today">{t("today") || "Today"}</SelectItem>
                    <SelectItem value="week">{t("thisWeek") || "This Week"}</SelectItem>
                    <SelectItem value="month">{t("thisMonth") || "This Month"}</SelectItem>
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
                    job.status === "pending"
                      ? "bg-red-500"
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
                        {job.status === "in_progress"
                          ? "In Progress"
                          : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
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
                            onClick={() => handleViewDetail(job.id)}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            {t("viewDetails") || "View Details"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleEditJob(job.id)}
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            {t("editJob") || "Edit Job"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <BarChart3 className="h-3 w-3 mr-2" />
                            {t("analytics") || "Analytics"}
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
                        <span className="text-xs font-medium uppercase tracking-wide">{t("client") || "Client"}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {job.client.name}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {t("location") || "Location"}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {job.workCenter.name}
                      </div>
                    </div>
                  </div>

                  {/* Job Details Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
                        {t("duration") || "Duration"}
                      </div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{job.duration}</div>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">
                        {t("shifts") || "Shifts"}
                      </div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{job.shifts}</div>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {t("progress") || "Progress"}
                      </span>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{job.progress}%</span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
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
                      onClick={() => handleViewDetail(job.id)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {t("viewDetails") || "View"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs bg-transparent border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleEditJob(job.id)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      {t("edit") || "Edit"}
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t("noJobsFound") || "No Jobs Found"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto text-sm">
                {t("noJobsMatchFilters") ||
                  "No jobs match your current search criteria. Try adjusting your filters or search terms."}
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
                {t("clearAllFilters") || "Clear All Filters"}
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
