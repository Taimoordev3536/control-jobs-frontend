"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building,
  MapPin,
  Clock,
  QrCode,
  Navigation,
  Wifi,
  Globe,
  PhoneCall,
  Fingerprint,
  CheckCircle,
  Star,
  PlayCircle,
  Coffee,
  AlertCircle,
} from "lucide-react"

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

interface JobCardProps {
  job: JobAssignment
  onCheckIn?: (job: JobAssignment) => void
  onCheckOut?: (job: JobAssignment) => void
  onFillSurvey?: (job: JobAssignment) => void
  showActions?: boolean
}

export function JobCard({ job, onCheckIn, onCheckOut, onFillSurvey, showActions = true }: JobCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          icon: PlayCircle,
          badgeColor: "bg-green-500",
        }
      case "on_break":
        return {
          color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
          icon: Coffee,
          badgeColor: "bg-orange-500",
        }
      case "scheduled":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
          icon: Clock,
          badgeColor: "bg-red-500",
        }
      case "completed":
        return {
          color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
          icon: CheckCircle,
          badgeColor: "bg-purple-500",
        }
      case "missed":
        return {
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
          icon: AlertCircle,
          badgeColor: "bg-gray-500",
        }
      default:
        return {
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          icon: Clock,
          badgeColor: "bg-gray-500",
        }
    }
  }

  const statusConfig = getStatusConfig(job.status)
  const StatusIcon = statusConfig.icon
  const completedTasks = job.tasks.filter((task) => task.completed).length

  return (
    <Card className="group border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-white dark:bg-gray-900">
      {/* Status Indicator Line */}
      <div
        className={`w-full h-0.5 ${
          job.status === "scheduled"
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
              <div className={`w-2 h-2 rounded-full ${statusConfig.badgeColor}`}></div>
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
                {job.status === "on_break"
                  ? "On Break"
                  : job.status === "in_progress"
                    ? "In Progress"
                    : job.status === "scheduled"
                      ? "Scheduled"
                      : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Client & Location Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Building className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wide">Client</span>
            </div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{job.client.name}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wide">Location</span>
            </div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{job.workCenter.name}</div>
          </div>
        </div>

        {/* Shift Time */}
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {job.shift.scheduleType === "fixed" && job.shift.startTime && job.shift.endTime
                  ? `${job.shift.startTime} - ${job.shift.endTime}`
                  : "Flexible Schedule"}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {job.shift.type}
            </Badge>
          </div>
        </div>

        {/* Hours Information */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">Expected Hours</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{job.expectedHours}h</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">Total Hours</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {job.status === "completed" && job.totalHours
                ? `${job.totalHours}h`
                : job.status === "in_progress"
                  ? "In Progress"
                  : job.status === "scheduled"
                    ? "---"
                    : "---"}
            </div>
          </div>
        </div>

        {/* Tasks Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Tasks Progress</span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {completedTasks}/{job.tasks.length}
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(completedTasks / job.tasks.length) * 100}%` }}
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

        {/* Signing Methods */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Sign-in methods:</span>
          <div className="flex gap-1">
            {job.signingMethods.qrCode && (
              <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded">
                <QrCode className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </div>
            )}
            {job.signingMethods.gps && (
              <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded">
                <Navigation className="w-3 h-3 text-green-600 dark:text-green-400" />
              </div>
            )}
            {job.signingMethods.wifi && (
              <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                <Wifi className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {job.signingMethods.ip && (
              <div className="p-1 bg-orange-100 dark:bg-orange-900/20 rounded">
                <Globe className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </div>
            )}
            {job.signingMethods.callerId && (
              <div className="p-1 bg-indigo-100 dark:bg-indigo-900/20 rounded">
                <PhoneCall className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2 pt-1">
            {job.status === "scheduled" && onCheckIn && (
              <Button
                size="sm"
                className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => onCheckIn(job)}
              >
                <Fingerprint className="w-3 h-3 mr-1" />
                Check In
              </Button>
            )}
            {(job.status === "in_progress" || job.status === "on_break") && (
              <>
                {onCheckOut && (
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onCheckOut(job)}
                    disabled={job.isOnBreak}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Check Out
                  </Button>
                )}
                {onFillSurvey && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs bg-transparent border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    onClick={() => onFillSurvey(job)}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Fill Survey
                  </Button>
                )}
              </>
            )}
            {job.status === "completed" && (
              <>
                <div className="flex-1 text-center py-2">
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                </div>
                {!job.survey?.submitted && onFillSurvey && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-transparent border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    onClick={() => onFillSurvey(job)}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Fill Survey
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
