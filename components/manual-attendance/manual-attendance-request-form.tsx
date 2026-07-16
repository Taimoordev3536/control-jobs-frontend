"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Calendar, MapPin, AlertCircle, Loader2, FileText } from "lucide-react"
import { madridWallClockToISO } from "@/lib/datetime"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"

type RequestType = "FULL_DAY" | "CHECK_IN_ONLY" | "CHECK_OUT_ONLY" | "EDIT_EXISTING"

interface Worker {
  id: number
  publicId?: string
  name?: string
  code?: string
  user?: {
    name?: string
    firstName?: string
    lastName?: string
  }
}

const getWorkerDisplayName = (w: Worker) => {
  if (w.user?.name) return w.user.name
  const parts = [w.user?.firstName, w.user?.lastName].filter(Boolean).join(" ").trim()
  if (parts) return parts
  if (w.name) return w.name
  if (w.code) return w.code
  return `Worker #${w.id}`
}

interface WorkCenter {
  id: number
  publicId?: string
  name?: string
  address?: string
}

interface Job {
  id?: number
  publicId?: string
  jobId?: string
  title?: string
  jobName?: string
  workers?: Worker[]
  workCenters?: Array<{ id?: number; publicId?: string; name?: string }>
  workCenter?: { id?: number; publicId?: string; name?: string }
}

interface ManualAttendanceRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job?: Job
  preSelectedWorker?: Worker
  preSelectedDate?: string
  preSelectedType?: RequestType
  existingWorkSessionId?: string
  mode?: "request" | "direct" // "request" needs approval, "direct" auto-approves
  onSuccess?: () => void
}

export default function ManualAttendanceRequestForm({
  open,
  onOpenChange,
  job,
  preSelectedWorker,
  preSelectedDate,
  preSelectedType,
  existingWorkSessionId,
  mode = "request",
  onSuccess,
}: ManualAttendanceRequestFormProps) {
  const { session } = useAuth()
  const { t } = useTranslation("manual-attendance")

  const [requestType, setRequestType] = useState<RequestType>(preSelectedType || "FULL_DAY")
  const [requestedDate, setRequestedDate] = useState(preSelectedDate || "")
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const [selectedWorkerId, setSelectedWorkerId] = useState("")
  const [selectedWorkCenterId, setSelectedWorkCenterId] = useState("")
  const [reason, setReason] = useState("")
  const [workerNotes, setWorkerNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")

  const userRole = (session as any)?.user?.role?.name?.toLowerCase() || ""

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRequestType(preSelectedType || "FULL_DAY")
      setRequestedDate(preSelectedDate || "")
      setCheckInTime("")
      setCheckOutTime("")
      setSelectedWorkerId(preSelectedWorker?.publicId || "")
      setSelectedWorkCenterId("")
      setReason("")
      setWorkerNotes("")
      setError("")
      setSelectedJobId("")
    }
  }, [open, preSelectedType, preSelectedDate, preSelectedWorker])

  // Fetch the current user's jobs when no job is passed in
  const { data: availableJobs = [], isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ["manual-attendance", "request-jobs", userRole],
    enabled: open && !job && !!session?.accessToken,
    queryFn: async () => {
      const endpoint =
        userRole === "worker"
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/worker/all-jobs`
          : userRole === "client"
            ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/client/all-jobs`
            : `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/employer/all-jobs`
      const r = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!r.ok) return []
      const data = await r.json()
      return (data?.data || []).map((j: any) => ({
        id: j.id,
        publicId: j.publicId || j.jobId,
        title: j.title || j.jobName,
        jobName: j.jobName || j.title,
        workers: j.workers || [],
        workCenters: j.workCenters || (j.workCenter ? [j.workCenter] : []),
      }))
    },
  })

  // Resolve active job: prop-provided OR selected from the list
  const activeJob: Job | undefined =
    job || availableJobs.find((j) => (j.publicId || String(j.id)) === selectedJobId)

  // Build work centers list from active job
  const workCenters: WorkCenter[] = []
  if (activeJob?.workCenters) {
    activeJob.workCenters.forEach((wc) => {
      if (wc.id || wc.publicId) workCenters.push(wc as WorkCenter)
    })
  } else if (activeJob?.workCenter) {
    workCenters.push(activeJob.workCenter as WorkCenter)
  }

  // Build workers list from active job
  const workers = activeJob?.workers || []

  // Calculate estimated hours
  const estimatedHours = (() => {
    if (!checkInTime || !checkOutTime) return null
    const [inH, inM] = checkInTime.split(":").map(Number)
    const [outH, outM] = checkOutTime.split(":").map(Number)
    let diffMin = (outH * 60 + outM) - (inH * 60 + inM)
    if (diffMin < 0) diffMin += 24 * 60 // cross midnight
    const hours = Math.floor(diffMin / 60)
    const mins = diffMin % 60
    return `${hours}h ${mins.toString().padStart(2, "0")}m`
  })()

  const handleSubmit = async () => {
    setError("")
    setIsSubmitting(true)

    try {
      // Build ISO timestamps from date + time
      let requestedCheckIn: string | undefined
      let requestedCheckOut: string | undefined

      if (checkInTime && requestedDate) {
        requestedCheckIn = madridWallClockToISO(requestedDate, checkInTime)
      }
      if (checkOutTime && requestedDate) {
        requestedCheckOut = madridWallClockToISO(requestedDate, checkOutTime)
      }

      const resolvedJobId = activeJob?.publicId || activeJob?.jobId
      if (!resolvedJobId) {
        setError(t("selectAJob") || "Please select a job for this request.")
        setIsSubmitting(false)
        return
      }

      const payload: Record<string, any> = {
        jobId: resolvedJobId,
        requestType,
        requestedDate,
        reason,
      }

      // Only include workerId if explicitly selected (workers auto-resolve on backend)
      const resolvedWorkerId = selectedWorkerId || preSelectedWorker?.publicId
      if (resolvedWorkerId) payload.workerId = resolvedWorkerId

      if (requestedCheckIn) payload.requestedCheckIn = requestedCheckIn
      if (requestedCheckOut) payload.requestedCheckOut = requestedCheckOut
      if (selectedWorkCenterId) payload.workCenterId = selectedWorkCenterId
      if (workerNotes) payload.workerNotes = workerNotes
      if (existingWorkSessionId) payload.existingWorkSessionId = existingWorkSessionId

      const endpoint = mode === "direct"
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/direct-entry`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.message || "Failed to submit request")
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestTypes: { value: RequestType; label: string; description: string }[] = [
    { value: "FULL_DAY", label: t("fullDay") || "Full Day", description: t("fullDayDesc") || "Missed entire shift" },
    { value: "CHECK_IN_ONLY", label: t("checkInOnly") || "Check-in Only", description: t("checkInOnlyDesc") || "Missed check-in" },
    { value: "CHECK_OUT_ONLY", label: t("checkOutOnly") || "Check-out Only", description: t("checkOutOnlyDesc") || "Missed check-out" },
    { value: "EDIT_EXISTING", label: t("editExisting") || "Edit Existing", description: t("editExistingDesc") || "Correct times" },
  ]

  const showCheckIn = requestType === "FULL_DAY" || requestType === "CHECK_IN_ONLY" || requestType === "EDIT_EXISTING"
  const showCheckOut = requestType === "FULL_DAY" || requestType === "CHECK_OUT_ONLY" || requestType === "EDIT_EXISTING"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[36rem] p-0 gap-0 max-h-[90vh] flex flex-col bg-background">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            {mode === "direct"
              ? (t("addManualAttendance") || "Add Manual Attendance")
              : (t("requestManualAttendance") || "Request Manual Attendance")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "direct"
              ? (t("addManualAttendance") || "Add Manual Attendance")
              : (t("requestManualAttendance") || "Request Manual Attendance")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {/* Job info / selector */}
          {job ? (
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {job.title || job.jobName}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t("job") || "Job"} *
              </Label>
              <Select
                value={selectedJobId}
                onValueChange={setSelectedJobId}
                disabled={isLoadingJobs || availableJobs.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingJobs
                        ? (t("loading") || "Loading...")
                        : availableJobs.length === 0
                          ? (t("noJobsAvailable") || "No jobs available")
                          : (t("selectJob") || "Select a job...")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableJobs.map((j) => (
                    <SelectItem
                      key={j.publicId || j.id}
                      value={j.publicId || String(j.id)}
                    >
                      {j.title || j.jobName || `Job #${j.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Worker selector (only for employer/client mode — workers are auto-resolved on the backend) */}
          {workers.length > 0 && !preSelectedWorker && userRole !== "worker" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("worker") || "Worker"} *</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectWorker") || "Select worker..."} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.publicId || w.id} value={w.publicId || String(w.id)}>
                      {getWorkerDisplayName(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Request Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("requestType") || "Request Type"}</Label>
            <div className="grid grid-cols-2 gap-2">
              {requestTypes.map((rt) => (
                <button
                  key={rt.value}
                  onClick={() => setRequestType(rt.value)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    requestType === rt.value
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50 ring-1 ring-purple-500"
                      : "border-border hover:border-purple-300 hover:bg-muted"
                  }`}
                >
                  <span className="text-xs font-medium block">{rt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{rt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {t("date") || "Date"} *
            </Label>
            <Input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full"
            />
          </div>

          {/* Work Center */}
          {workCenters.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {t("workCenter") || "Work Center"}
              </Label>
              <Select value={selectedWorkCenterId} onValueChange={setSelectedWorkCenterId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectWorkCenter") || "Select work center..."} />
                </SelectTrigger>
                <SelectContent>
                  {workCenters.map((wc) => (
                    <SelectItem key={wc.publicId || wc.id} value={wc.publicId || String(wc.id)}>
                      {wc.name || `Work Center #${wc.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            {showCheckIn && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("checkInTime") || "Check-in Time"} *</Label>
                <Input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
            {showCheckOut && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("checkOutTime") || "Check-out Time"} *</Label>
                <Input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Estimated hours */}
          {estimatedHours && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {t("estimatedHours") || "Estimated"}: <Badge variant="secondary">{estimatedHours}</Badge>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("reason") || "Reason"} *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder") || "Explain why manual attendance is needed..."}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Additional notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("additionalNotes") || "Additional Notes"}</Label>
            <Textarea
              value={workerNotes}
              onChange={(e) => setWorkerNotes(e.target.value)}
              placeholder={t("optionalNotes") || "Optional additional notes..."}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Info message */}
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {mode === "direct"
                  ? (t("directEntryInfo") || "This entry will be recorded immediately.")
                  : (t("requestInfo") || "This request will be sent to your employer for review and approval.")}
              </p>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200">
              <CardContent className="p-3">
                <p className="text-xs text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !requestedDate || !reason.trim() || !activeJob}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "direct"
              ? (t("createEntry") || "Create Entry")
              : (t("submitRequest") || "Submit Request")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
