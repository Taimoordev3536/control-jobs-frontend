"use client"

import JobsIcon from "../../../icons/Menu/Jobs.svg"
import ClientIcon from "../../../icons/Menu/clients.svg"
import WorkersIcon from "../../../icons/Menu/workers.svg"
import SurvayIcon from "../../../icons/Menu/surveys.svg"
import WorkCenterIcon from "../../../icons/Otros/centros.svg"
import ControlIcon from "../../../icons/new/control.svg"
import TodosIcon from "../../../icons/new/todos.svg"
import NotificationIcon from "../../../icons/Header/Notification.svg"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, MapPin, Clock, Calendar, AlertCircle, Users, Eye, LogIn, Edit, Bell, QrCode, Lock, Globe } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useRouter } from "next/navigation"

interface Job {
  id: number
  title: string
  jobId: string
  client?: {
    id: number
    name: string
  }
  workCenter?: {
    id: number
    name: string
    address?: string
    coordinates?: { lat: number; lng: number }
  }
  workCenters?: Array<{ id?: number; name?: string }>
  workers: Array<{
    id: number
    name?: string
    code?: string
    avatar?: string
  }>
  status?: "scheduled" | "in_progress" | "completed"
  jobStatus?: string
  startDate?: Date | string
  endDate?: Date | string
  duration?: string
  shifts?: number
  occupation?: string
  tags?: string[]
  hasAttendanceRecord?: boolean
  jobDurationDays?: number
  expectedHours?: number
  scheduleType?: string
  activeScheduleWeekHours?: number | null
  shift?: {
    type?: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    duration?: string
    scheduleType?: string
  }
  tasks?: Array<{
    id: number
    name: string
    description?: string
    completed?: boolean
    duration?: string
    timing?: "during" | "after"
  }>
  signingMethods?: Array<{ methodType?: string; methodDetails?: any; verifyIdentity?: boolean }>
  // optional derived fields (if provided by dashboard transformer)
  signingMobile?: string[]
  signingPc?: string[]
  hasClientSurvey?: boolean
  hasWorkerSurvey?: boolean
}

interface EmployerJobCardProps {
  job: any
  onViewDetails: (job: any) => void
  onEdit: (jobId: number) => void
  onViewRecords: (job: any) => void
}

export function EmployerJobCard({ job, onViewDetails, onEdit, onViewRecords }: EmployerJobCardProps) {
    const router = useRouter();
  const { t } = useTranslation("employer-dashboard")

  // Format date to short format like "1 Sep, 2025" - accept string or Date
  const formatDateShort = (date?: Date | string) => {
    if (!date) return ""
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Get status color and label
const getStatusConfig = (status: string) => {
  switch (status) {
    case "in_progress":
      return {
        label: t("inProgress"),
        color: "bg-emerald-100 text-emerald-700",
        headerBg: "bg-emerald-500",
      };
    case "scheduled":
      return {
        label: t("scheduled"),
        color: "bg-indigo-100 text-indigo-700",
        headerBg: "bg-indigo-500",
      };
    case "completed":
      return {
        label: t("completed"),
        color: "bg-purple-100 text-purple-700",
        headerBg: "bg-purple-600",
      };
    case "paused":
      return {
        label: t("paused"),
        color: "bg-amber-100 text-amber-700",
        headerBg: "bg-amber-400",
      };
    case "active":
      return {
        label: t("active"),
        color: "bg-rose-100 text-rose-700",
        headerBg: "bg-rose-500",
      };
    default:
      return {
        label: "Estado",
        color: "bg-gray-100 text-gray-700",
        headerBg: "bg-gray-400",
      };
  }
};


  const statusConfig = getStatusConfig((job.status as string) || (job.jobStatus as string) || "")

  // Allow headerBg to be either a Tailwind class (e.g. 'bg-blue-500')
  // or a raw color string like '#7C3AED'. If it's a raw color we apply it
  // via the `style` prop because a hex value is not a valid class name.
  const rawHeaderBg = (statusConfig as any).headerBg as string | undefined
  const isHexColor = typeof rawHeaderBg === 'string' && rawHeaderBg.trim().startsWith('#')
  const headerStyle = isHexColor ? { backgroundColor: rawHeaderBg } : undefined
  const headerClassFromConfig = !isHexColor && rawHeaderBg ? rawHeaderBg : ''

  // Resolve work centers - support new `workCenters` array or legacy single `workCenter` name
  const centersArray: string[] = (job.workCenters && job.workCenters.length > 0)
    ? job.workCenters.map((w: unknown): string => (w && (w as any).name) ? String((w as any).name) : "").filter(Boolean)
    : job.workCenter?.name
      ? [job.workCenter.name]
      : (typeof (job as any).workCenterNames === 'string' ? (job as any).workCenterNames.split(',').map((s: string) => s.trim()) : [])

  const mainCenter = centersArray[0] || "Unknown location"
  const additionalBranches = Math.max(0, centersArray.length - 1)

  // Format task tags (show first 2, then +n) - tasks may be objects
  const taskNames: string[] = (job.tasks || []).map((t: unknown): string => {
    if (!t) return ''
    const name = (t as any).name
    return name ? String(name) : String(t)
  })
  const displayTasks = taskNames.slice(0, 2)
  const moreTasks = Math.max(0, taskNames.length - 2)

  // If job end year is greater than 2100 treat it as no end date (infinite)
  const formatEndDisplay = (date?: Date | string) => {
    if (!date) return '∞'
    const d = typeof date === 'string' ? new Date(date) : date
    const yr = d.getFullYear()
    if (isNaN(yr)) return '∞'
    return yr > 2100 ? '∞' : formatDateShort(d)
  }

  // Signing methods helpers
  const normalizeDetail = (v: string) => {
    const s = String(v || '').toLowerCase()
    if (s.includes('qr')) return 'qrcode'
    if (s.includes('gps')) return 'gps'
    if (s.includes('ip')) return 'ip'
    if (s.includes('web') || s.includes('wifi')) return 'web'
    return s
  }

  const deriveMethodsFromArray = (type: 'mobile' | 'pc') => {
    // Be defensive: signingMethods may not be an array in some payloads
    const arr = Array.isArray((job as any).signingMethods) ? (job as any).signingMethods : []
    const items = arr.filter((m: any) => {
      const t = String(m?.methodType || (m as any)?.type || '').toLowerCase()
      return type === 'mobile' ? t.includes('mobile') : (t.includes('pc') || t.includes('laptop') || t.includes('web'))
    })
    const details = items.flatMap((m: any) => {
      const d = (m.methodDetails || (m as any).details || [])
      return Array.isArray(d) ? d : [d]
    })
    const normalized = details.map((d: any) => normalizeDetail(String(d || '')))
    // Allowed sets from DB: Mobile -> qr, gps, ip, web | PC -> web, ip
    const allowed = type === 'mobile' ? ['qrcode', 'gps', 'ip', 'web'] : ['web', 'ip']
    return Array.from(new Set(normalized.filter((v: string) => allowed.includes(v))))
  }

  const toStringArray = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : [])

  const rawMobile = (job as any).signingMobile as any
  const mobileMethods: string[] = (Array.isArray(rawMobile)
    ? toStringArray(rawMobile).filter((v) => ['qrcode', 'gps', 'ip', 'web'].includes(String(v).toLowerCase()))
    : deriveMethodsFromArray('mobile')) as any

  const rawPc = (job as any).signingPc as any
  const pcMethods: string[] = (Array.isArray(rawPc)
    ? toStringArray(rawPc).filter((v) => ['web', 'ip'].includes(String(v).toLowerCase()))
    : deriveMethodsFromArray('pc')) as any

  const MethodPill = ({ icon: Icon, label, color }: { icon: any; label: string; color?: string }) => (
    <div className="flex items-center gap-1">
      <Icon className={`w-4 h-4 ${color || ''}`} />
      <span className="text-[10px]">{label}</span>
    </div>
  )

  const renderMethod = (m: string, index: number) => {
    const key = String(m).toLowerCase()
    switch (key) {
      case 'qrcode':
      case 'qr':
        return <MethodPill key={`qr-${index}`} icon={QrCode} label="QR" color="text-blue-600" />
      case 'gps':
        return <MethodPill key={`gps-${index}`} icon={MapPin} label="GPS" color="text-emerald-600" />
      case 'ip':
        return <MethodPill key={`ip-${index}`} icon={Globe} label="IP" color="text-orange-500" />
      case 'web':
      case 'wifi':
        // Using Lock icon as per spec reference screenshot for Web
        return <MethodPill key={`web-${index}`} icon={Lock} label="Web" color="text-purple-600" />
      default:
        return null
    }
  }

  return (
    <Card className="w-full overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card">
      <div
        className={`${headerClassFromConfig} h-8 flex items-center justify-center`}
        style={headerStyle}
      >
        <span className="text-white font-bold text-sm tracking-wide">{statusConfig.label}</span>
      </div>

      <CardContent className="p-3 space-y-3">
        {/* Client Name */}
        <div className="flex items-center gap-3">
          <div className="p-1 bg-muted rounded">
            <ClientIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="p-1 font-bold text-gray-900 dark:text-white text-sm">
              {(() => {
                // If no clientId (null/undefined/0 treated as missing) then show employer name with suffix
                const clientId = (job as any).clientId ?? job.client?.id
                const clientName = job.client?.name || (job as any).clientName || ''
                const employerName = (job as any).employerName || ''
                if (clientId == null || clientName === '') {
                  // Show employer with suffix Yo mismo
                  return employerName ? `${employerName} (Yo mismo)` : 'Yo mismo'
                }
                return clientName
              })()}
            </h3>
          </div>
        </div>

        {/* Work Centers / Branches */}
        <div className="flex items-start gap-3">
          <div className="p-1 bg-muted rounded">
            <WorkCenterIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="p-1 text-sm text-gray-900 dark:text-white font-medium">
              {mainCenter}
              {additionalBranches > 0 && (
                <Badge className="ml-2 bg-muted hover:bg-muted/80 text-foreground text-xs">+{additionalBranches}</Badge>
              )}
            </div>
          </div>
        </div>

                {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Job Name */}
        <div className="flex items-start gap-3 my-0">
          <div className="p-1 bg-muted rounded">
            <JobsIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <p className="p-1 text-sm text-purple-600 dark:text-purple-400 font-medium">{job.title || (job as any).jobName || ''}</p>
          </div>
        </div>

                {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Team Members */}
        <div className="flex items-start gap-3">
          <div className="p-1 bg-muted rounded">
            <WorkersIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <div className="p-1 text-sm text-gray-900 dark:text-white font-medium">
              {job.workers.length > 0 ? (job.workers[0].name || `Worker ${job.workers[0].code || job.workers[0].id}`) : "No workers assigned"}
              {job.workers.length > 1 && (
                <Badge className="ml-2 bg-muted hover:bg-muted/80 text-foreground text-xs">
                  +{job.workers.length - 1}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

  {/* Date and Schedule Section (styled block to match screenshot) */}
  <div className="space-y-2 bg-muted rounded-md p-3">
          {/* Date Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-300 font-semibold ">
                <Calendar className="w-4 h-4 " />
                <span className="text-sm">
                  {formatDateShort(job.startDate)} - {formatEndDisplay(job.endDate)}
                </span>
              </div>
              <NotificationIcon className="w-4 h-4 " />
          </div>

          {/* Schedule Row */}
          <div className="flex items-center justify-between font-semibold text-gray-500 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 " />
              {(() => {
                const raw = (((job as any).scheduleType || job.scheduleType || job.shift?.scheduleType || '') as string)
                const st = raw.toLowerCase()
                const label = st === 'free' ? t('free') : st === 'normal' ? t('normal') : st === 'summer' ? t('summer') : (raw || 'Programación')
                return <span className="text-sm">{label}</span>
              })()}
            </div>
            <div className="flex items-center gap-2">
              {/* Show hours when schedule type is fixed/summer/normal/seasonal; hide for free */}
              {(() => {
                const st = (((job as any).scheduleType || job.scheduleType || job.shift?.scheduleType || '') as string).toLowerCase()
                if (st === 'free') return null
                // prefer activeScheduleWeekHours for seasonal variants if present
                const seasonalHours = (job as any).activeScheduleWeekHours ?? job.activeScheduleWeekHours
                const hours = (['summer','normal','seasonal'].includes(st) && typeof seasonalHours === 'number')
                  ? seasonalHours
                  : (typeof job.expectedHours !== 'undefined' && job.expectedHours !== null
                      ? job.expectedHours
                      : (job as any).expectedDuration || 0)
                return (
                  <>
                    <span className="text-sm  ">{hours} h/sem</span>
                    <MapPin className="w-4 h-4 " />
                  </>
                )
              })()}
            </div>
          </div>

          {/* Signing methods row: left=Mobile methods, right=PC/Laptop methods */}
          <div className="flex items-center justify-between mt-2 text-gray-900 dark:text-gray-300 font-semibold">
            <div className="flex items-center gap-4 text-sm">
              {mobileMethods && mobileMethods.length > 0 && (
                <div className="flex items-center gap-4">
                  {mobileMethods.map((method, index) => renderMethod(method, index))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {pcMethods && pcMethods.length > 0 && (
                <div className="flex items-center gap-4">
                  {pcMethods.map((method, index) => renderMethod(method, index))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

        {/* Task Badges - Yellow */}
        <div className="flex flex-wrap gap-2">
          {displayTasks.map((task: string, index: number) => (
            <Badge
              key={index}
              className="bg-[#EDE9FE] hover:bg-[#C4B5FD] text-black text-xs font-semibold px-3 py-1"
            >
              {task || `Tarea ${index + 1}`}
            </Badge>
          ))}
          {moreTasks > 0 && (
            <Badge className="ml-2 bg-muted hover:bg-muted/80 text-foreground text-xs">
              +{moreTasks}
            </Badge>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border my-2"></div>

        {/* Clients and Workers Status (survey flags) */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <SurvayIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {t("clients")}: <span className="font-bold">{job.hasClientSurvey ? 'Sí' : 'No'}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <SurvayIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {t("workers")}: <span className="font-bold">{job.hasWorkerSurvey ? 'Sí' : 'No'}</span>
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-2"></div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewRecords(job)}
          >
            <TodosIcon className="w-3 h-3 mr-1" />
            {t("details")}
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white"
            onClick={() => router.push(`/records/employer?jobId=${job.id}`)}
          >
            <ControlIcon className="w-3 h-3 mr-1" />
            {t("records")}
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-purple-50 text-purple-600 font-medium hover:bg-purple-100 transition"
            onClick={() => router.push(`/jobs/${job.id}/edit`)}
          >
            <Edit className="w-3 h-3 mr-1" />
            {t("edit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default EmployerJobCard
