"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
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
import { Clock, Calendar, MapPin, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"

type RequestType = "FULL_DAY" | "CHECK_IN_ONLY" | "CHECK_OUT_ONLY" | "EDIT_EXISTING"

interface Worker {
  id: number
  publicId?: string
  name?: string
  code?: string
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
  const { t } = useTranslation()

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
    }
  }, [open, preSelectedType, preSelectedDate, preSelectedWorker])

  // Build work centers list from job
  const workCenters: WorkCenter[] = []
  if (job?.workCenters) {
    job.workCenters.forEach((wc) => {
      if (wc.id || wc.publicId) workCenters.push(wc as WorkCenter)
    })
  } else if (job?.workCenter) {
    workCenters.push(job.workCenter as WorkCenter)
  }

  // Build workers list from job
  const workers = job?.workers || []

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
        requestedCheckIn = new Date(`${requestedDate}T${checkInTime}:00`).toISOString()
      }
      if (checkOutTime && requestedDate) {
        requestedCheckOut = new Date(`${requestedDate}T${checkOutTime}:00`).toISOString()
      }

      const payload: Record<string, any> = {
        jobId: job?.publicId || job?.jobId,
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

      console.log('[ManualAttendance] job object:', job)
      console.log('[ManualAttendance] payload:', JSON.stringify(payload, null, 2))

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
        console.error('[ManualAttendance] error response:', errData)
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
        </DialogHeader>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {/* Job info */}
          {job && (
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {job.title || job.jobName}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Worker selector (only for employer/client mode) */}
          {workers.length > 0 && !preSelectedWorker && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("worker") || "Worker"} *</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectWorker") || "Select worker..."} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.publicId || w.id} value={w.publicId || String(w.id)}>
                      {w.name || w.code || `Worker #${w.id}`}
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
            disabled={isSubmitting || !requestedDate || !reason.trim()}
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
