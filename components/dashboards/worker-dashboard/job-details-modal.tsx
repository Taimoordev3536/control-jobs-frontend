"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  Building,
  TrendingUp,
  CheckCircle,
  XCircle,
  Timer,
  CalendarDays,
  Activity,
  BarChart3,
  Download,
} from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"

interface AttendanceRecord {
  id: number
  date: Date
  checkInTime: Date | null
  checkOutTime: Date | null
  totalHours: number
  breakTime: number
  status: "present" | "absent" | "late" | "early_leave"
  notes?: string
}

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
  jobPeriod: {
    startDate: Date
    endDate: Date
    totalDays: number
    workedDays: number
    remainingDays: number
  }
  status: "scheduled" | "pending" | "in_progress" | "completed" | "cancelled" | "on_hold"
  attendanceSummary: {
    totalWorkingDays: number
    attendedDays: number
    totalHours: number
    averageHoursPerDay: number
    attendanceRate: number
  }
  attendanceRecords: AttendanceRecord[]
}

interface JobDetailsModalProps {
  job: JobAssignment | null
  isOpen: boolean
  onClose: () => void
}

export function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  const { t } = useTranslation("worker-dashboard")
  const [activeTab, setActiveTab] = useState("overview")

  if (!job) return null

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: DEFAULT_TIMEZONE,
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "absent":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "late":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "early_leave":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "absent":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "late":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "early_leave":
        return <Timer className="w-4 h-4 text-orange-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "present":
        return t("present")
      case "absent":
        return t("absent")
      case "late":
        return t("late")
      case "early_leave":
        return t("earlyLeave")
      default:
        return status
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                Job ID: {job.jobId} • {job.client.name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="attendance">{t("attendance")}</TabsTrigger>
            <TabsTrigger value="statistics">{t("statistics")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Job Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {t("jobInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("client")}:</span>
                    <span className="text-sm font-medium">{job.client.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("location")}:</span>
                    <span className="text-sm font-medium">{job.workCenter.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Shift:</span>
                    <span className="text-sm font-medium capitalize">{job.shift.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Schedule:</span>
                    <span className="text-sm font-medium">
                      {job.shift.scheduleType === "fixed" && job.shift.startTime && job.shift.endTime
                        ? `${job.shift.startTime} - ${job.shift.endTime}`
                        : t("free")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    {t("jobPeriod")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("startDate")}:</span>
                    <span className="text-sm font-medium">{formatDate(job.jobPeriod.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("endDate")}:</span>
                    <span className="text-sm font-medium">{formatDate(job.jobPeriod.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("totalDays")}:</span>
                    <span className="text-sm font-medium">
                      {job.jobPeriod.totalDays} {t("days")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("remaining")}:</span>
                    <span className="text-sm font-medium">
                      {job.jobPeriod.remainingDays} {t("days")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {job.attendanceSummary.attendanceRate}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("attendanceRate")}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {job.attendanceSummary.attendedDays}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("daysWorked")}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {job.attendanceSummary.totalHours}
                    {t("hours")}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("totalHours")}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {job.attendanceSummary.averageHoursPerDay}
                    {t("hours")}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("avgHoursPerDay")}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t("attendanceRecords")}</h3>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t("export")}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {job.attendanceRecords.map((record) => (
                <Card key={record.id} className="border border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium text-sm">{formatDate(record.date)}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {record.checkInTime && record.checkOutTime
                              ? `${formatTime(record.checkInTime)} - ${formatTime(record.checkOutTime)}`
                              : record.checkInTime
                                ? `In: ${formatTime(record.checkInTime)}`
                                : t("noCheckIn")}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(record.status)}>{getStatusText(record.status)}</Badge>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {record.totalHours}
                          {t("hours")} {t("worked")}
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        {record.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t("weeklyPerformance")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    Weekly performance chart would go here
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t("monthlyTrends")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    Monthly trends chart would go here
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t("performanceMetrics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">95%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t("onTimeRateMetric")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">8.2{t("hours")}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t("avgDailyHours")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">45{t("minutes")}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t("avgBreakTime")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">2</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t("lateDays")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
