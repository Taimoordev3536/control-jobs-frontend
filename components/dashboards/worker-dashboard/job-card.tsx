"use client"

import * as React from "react"
import SignInMethodDialog from "./SignInMethodDialog"
import { useIsMobile } from "@/hooks/use-mobile"

import JobsIcon from "../../../icons/Menu/Jobs.svg"
import ClientIcon from "../../../icons/Menu/clients.svg"
import WorkersIcon from "../../../icons/Menu/workers.svg"
import WorkCenterIcon from "../../../icons/Otros/centros.svg"
import TodosIcon from "../../../icons/new/todos.svg"
import ControlIcon from "../../../icons/new/control.svg"
import NotificationIcon from "../../../icons/Header/Notification.svg"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, QrCode, Globe, Lock, FileEdit } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useRouter } from "next/navigation"

interface Job {
  id: number
  jobId: string
  title: string
  client?: {
    id: number
    name: string
  }
  workCenter?: {
    id: number
    name: string
    address?: string
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
  expectedHours?: number
  scheduleType?: string
  activeScheduleWeekHours?: number | null
  shift?: {
    type?: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    scheduleType?: string
  }
  tasks?: Array<{
    id: number
    name: string
    completed?: boolean
  }>
  signingMethods?: Array<{ methodType?: string; methodDetails?: any }>
  signingMobile?: string[]
  signingPc?: string[]
}

interface ClientJobCardProps {
  job: Job
  onViewDetails: (job: Job) => void
  onViewRecords: (job: Job) => void
  onEnter?: (job: Job, method?: string, data?: any) => void
  onRequestManualAttendance?: (job: Job) => void
}

export function ClientJobCard({ job, onViewDetails, onViewRecords, onEnter, onRequestManualAttendance }: ClientJobCardProps) {
  const { t } = useTranslation("dashboard")
  const router = useRouter()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const isMobileDevice = useIsMobile()

  const formatDateShort = (date?: Date | string) => {
    if (!date) return ""
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          label: t("inProgress"),
          color: "bg-emerald-100 text-emerald-700",
          headerBg: "bg-emerald-500",
        }
      case "scheduled":
        return {
          label: t("scheduled"),
          color: "bg-indigo-100 text-indigo-700",
          headerBg: "bg-indigo-500",
        }
      case "completed":
        return {
          label: t("completed"),
          color: "bg-purple-100 text-purple-700",
          headerBg: "bg-purple-600",
        }
      default:
        return {
          label: "Status",
          color: "bg-muted text-muted-foreground",
          headerBg: "bg-muted",
        }
    }
  }

  const statusConfig = getStatusConfig((job.status as string) || (job.jobStatus as string) || "")
  const rawHeaderBg = (statusConfig as any).headerBg as string | undefined
  const isHexColor = typeof rawHeaderBg === "string" && rawHeaderBg.trim().startsWith("#")
  const headerStyle = isHexColor ? { backgroundColor: rawHeaderBg } : undefined
  const headerClassFromConfig = !isHexColor && rawHeaderBg ? rawHeaderBg : ""

  const centersArray: string[] =
    job.workCenters && job.workCenters.length > 0
      ? job.workCenters
          .map((w: unknown): string => (w && (w as any).name ? String((w as any).name) : ""))
          .filter(Boolean)
      : job.workCenter?.name
        ? [job.workCenter.name]
        : []
  const mainCenter = centersArray[0] || "Unknown location"
  const additionalBranches = Math.max(0, centersArray.length - 1)

  // Normalize workers to avoid runtime errors when job.workers is undefined/null
  const workers = Array.isArray(job.workers) ? job.workers : []
  const firstWorker = workers[0]

  const taskNames: string[] = (job.tasks || []).map((t: unknown): string => {
    if (!t) return ""
    const name = (t as any).name
    return name ? String(name) : String(t)
  })
  const displayTasks = taskNames.slice(0, 2)
  const moreTasks = Math.max(0, taskNames.length - 2)

  const formatEndDisplay = (date?: Date | string) => {
    if (!date) return "∞"
    const d = typeof date === "string" ? new Date(date) : date
    const yr = d.getFullYear()
    if (isNaN(yr)) return "∞"
    return yr > 2100 ? "∞" : formatDateShort(d)
  }

  const normalizeDetail = (v: string) => {
    const s = String(v || "").toLowerCase()
    if (s.includes("qr")) return "qrcode"
    if (s.includes("gps")) return "gps"
    if (s.includes("ip")) return "ip"
    if (s.includes("web") || s.includes("wifi")) return "web"
    return s
  }

  const deriveMethodsFromArray = (type: "mobile" | "pc"): string[] => {
    const arr = Array.isArray((job as any).signingMethods) ? (job as any).signingMethods : []
    const items = arr.filter((m: any) => {
      const t = String(m?.methodType || (m as any)?.type || "").toLowerCase()
      return type === "mobile" ? t.includes("mobile") : t.includes("pc") || t.includes("laptop") || t.includes("web")
    })
    const details = items.flatMap((m: any) => {
      const d = m.methodDetails || (m as any).details || []
      return Array.isArray(d) ? d : [d]
    })
    const normalized = details.map((d: any) => normalizeDetail(String(d || "")))
    const allowed = type === "mobile" ? ["qrcode", "gps", "ip", "web"] : ["web", "ip"]
    return Array.from(new Set(normalized.filter((v: string) => allowed.includes(v))))
  }

  const toStringArray = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : [])

  const rawMobile = (job as any).signingMobile as any
  const mobileMethods: string[] = (Array.isArray(rawMobile)
    ? toStringArray(rawMobile).filter((v) => ["qrcode", "gps", "ip", "web"].includes(String(v).toLowerCase()))
    : deriveMethodsFromArray("mobile")) as string[]

  const rawPc = (job as any).signingPc as any
  const pcMethods: string[] = (Array.isArray(rawPc)
    ? toStringArray(rawPc).filter((v) => ["web", "ip"].includes(String(v).toLowerCase()))
    : deriveMethodsFromArray("pc")) as string[]

  const MethodPill = ({ icon: Icon, label, color }: { icon: any; label: string; color?: string }) => (
    <div className="flex items-center gap-1">
      <Icon className={`w-4 h-4 ${color || ""}`} />
      <span className="text-[10px]">{label}</span>
    </div>
  )

  const renderMethod = (m: string, idx: number) => {
    const key = String(m).toLowerCase()
    switch (key) {
      case "qrcode":
      case "qr":
        return <MethodPill key={`${key}-${idx}`} icon={QrCode} label="QR" color="text-blue-600" />
      case "gps":
        return <MethodPill key={`${key}-${idx}`} icon={MapPin} label="GPS" color="text-emerald-600" />
      case "ip":
        return <MethodPill key={`${key}-${idx}`} icon={Globe} label="IP" color="text-orange-500" />
      case "web":
      case "wifi":
        return <MethodPill key={`${key}-${idx}`} icon={Lock} label="Web" color="text-purple-600" />
      default:
        return null
    }
  }

  return (
    <Card className="w-full overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card">
      <div className={`${headerClassFromConfig} h-8 flex items-center justify-center`} style={headerStyle}>
        <span className="text-white font-bold text-sm tracking-wide">{statusConfig.label}</span>
      </div>

      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-muted rounded">
            <ClientIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="p-1 font-bold text-foreground text-sm">{(job.client && job.client.name) || (job as any).clientName || "Client"}</h3>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-1 bg-muted rounded">
            <WorkCenterIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <div className="p-1 text-sm text-foreground font-medium">
              {mainCenter}
              {additionalBranches > 0 && (
                <Badge className="ml-2 bg-muted hover:bg-muted/80 text-foreground text-xs">+{additionalBranches}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border"></div>

        <div className="flex items-start gap-3">
          <div className="p-1 bg-muted rounded">
            <JobsIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="p-1 text-sm text-purple-600 dark:text-purple-400 font-medium">{(job as any).jobName || job.title}</p>
          </div>
        </div>

        <div className="border-t border-border"></div>

        <div className="flex items-start gap-3">
          <div className="p-1 bg-muted rounded">
            <WorkersIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <div className="p-1 text-sm text-foreground font-medium">
              {workers.length > 0
                ? firstWorker?.name || `Worker ${firstWorker?.code || firstWorker?.id}`
                : "No workers assigned"}
              {workers.length > 1 && (
                <Badge className="ml-2 bg-muted hover:bg-muted/80 text-foreground text-xs">
                  +{workers.length - 1}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border"></div>

        <div className="space-y-2 bg-muted rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {formatDateShort(job.startDate)} - {formatEndDisplay(job.endDate)}
              </span>
            </div>
            <NotificationIcon className="w-4 h-4" />
          </div>

          <div className="flex items-center justify-between font-semibold text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {(() => {
                const raw = ((job as any).scheduleType || job.scheduleType || job.shift?.scheduleType || "") as string
                const st = raw.toLowerCase()
                const label =
                  st === "free"
                    ? t("free")
                    : st === "normal"
                      ? t("normal")
                      : st === "summer"
                        ? t("summer")
                        : raw || "Schedule"
                return <span className="text-sm">{label}</span>
              })()}
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const st = (
                  ((job as any).scheduleType || job.scheduleType || job.shift?.scheduleType || "") as string
                ).toLowerCase()
                if (st === "free") return null
                const seasonalHours = (job as any).activeScheduleWeekHours ?? job.activeScheduleWeekHours
                const hours =
                  ["summer", "normal", "seasonal"].includes(st) && typeof seasonalHours === "number"
                    ? seasonalHours
                    : typeof job.expectedHours !== "undefined" && job.expectedHours !== null
                      ? job.expectedHours
                      : (job as any).expectedDuration || 0
                return (
                  <>
                    <span className="text-sm">{hours} h/sem</span>
                    <MapPin className="w-4 h-4" />
                  </>
                )
              })()}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-foreground font-semibold">
            <div className="flex items-center gap-4 text-sm">
              {mobileMethods && mobileMethods.length > 0 && (
                <div className="flex items-center gap-4">{mobileMethods.map((m, idx) => renderMethod(m, idx))}</div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {pcMethods && pcMethods.length > 0 && (
                <div className="flex items-center gap-4">{pcMethods.map((m, idx) => renderMethod(m, idx))}</div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border my-2"></div>

        <div className="flex flex-wrap gap-2">
          {displayTasks.map((task: string, index: number) => (
            <Badge key={index} className="bg-[#EDE9FE] hover:bg-[#C4B5FD] text-black text-xs font-semibold px-3 py-1">
              {task || `Task ${index + 1}`}
            </Badge>
          ))}
          {moreTasks > 0 && (
            <Badge className="ml-2 bg-muted hover:bg-muted/80 text-foreground text-xs">+{moreTasks}</Badge>
          )}
        </div>

        <div className="border-t border-border my-2"></div>

        {/* Action Buttons: Details and Registros (Records) */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-neutral-500 hover:bg-neutral-600 text-white"
            onClick={() => onViewDetails(job)}
          >
            <TodosIcon className="w-3 h-3 mr-1" />
            {t("details")}
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white"
            onClick={() => router.push("/records/worker")}
          >
            <ControlIcon className="w-3 h-3 mr-1" />
            {t("records")}
          </Button>
                    {/* Enter button (red) */}
          <Button
            size="sm"
            // bg-[#F59E0B] hover:bg-[#D97706]
            className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white"
            onClick={() => setDialogOpen(true)}
          >
            <Clock className="w-3 h-3 mr-1" />
            {t("enter") || "Enter"}
          </Button>
        </div>
        {/* Manual Attendance Request Button */}
        {onRequestManualAttendance && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
              onClick={() => onRequestManualAttendance(job)}
            >
              <FileEdit className="w-3 h-3 mr-1" />
              {t("requestManualAttendance") || "Request Manual Attendance"}
            </Button>
          </div>
        )}
        {/* Sign-in methods dialog (opened when Enter is clicked) */}
        <SignInMethodDialog
          isOpen={dialogOpen}
          job={job}
          workerName={firstWorker?.name || firstWorker?.code || `Worker ${firstWorker?.id}`}
          signingMethods={(() => {
            // choose which set to show depending on client device
            const source = isMobileDevice ? mobileMethods || [] : pcMethods || []
            const mapToCanonical = (v: string) => {
              const s = String(v || "").toLowerCase()
              if (s.includes("qr")) return "QRCODE"
              if (s.includes("gps")) return "GPS"
              if (s.includes("ip")) return "IP"
              if (s.includes("web") || s.includes("wifi")) return "WEB"
              return v.toUpperCase()
            }
            return Array.from(new Set(source.map(mapToCanonical)))
          })()}
          onClose={() => setDialogOpen(false)}
          onSelect={(method, data) => {
            // selected sign-in method with collected data; close dialog and call onEnter if provided
            setDialogOpen(false)
            try {
              onEnter && onEnter(job, method, data)
            } catch (e) {
              // ignore
            }
            console.debug("Selected sign-in method:", method, "with data:", data, "for job", job?.jobId || job?.id)
          }}
        />
      </CardContent>
    </Card>
  )
}

export default ClientJobCard
