"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedLoader } from "@/components/animated-loader"
import {
  Check,
  X,
  Clock,
  Calendar,
  User,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react"

interface ManualAttendanceRequest {
  id: number
  publicId: string
  requestType: string
  status: string
  requestedDate: string
  requestedCheckIn?: string
  requestedCheckOut?: string
  reason?: string
  workerNotes?: string
  requestedByRole: string
  reviewerNotes?: string
  reviewedAt?: string
  createdAt: string
  job?: {
    id: number
    publicId: string
    jobName: string
  }
  worker?: {
    id: number
    publicId: string
    code?: string
    user?: { name?: string; firstName?: string; lastName?: string }
  }
  workCenter?: {
    id: number
    name?: string
  }
  requestedByUser?: {
    name?: string
    firstName?: string
    lastName?: string
  }
  reviewedByUser?: {
    name?: string
    firstName?: string
    lastName?: string
  }
}

export default function ControlManualTab({
  showFilters,
  onShowFiltersChange,
}: {
  showFilters?: boolean
  onShowFiltersChange?: (v: boolean) => void
  filters?: Record<string, string>
  onFiltersChange?: (f: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<ManualAttendanceRequest[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("PENDING")

  const fetchRequests = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter !== "all") params.set("status", activeFilter)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!res.ok) throw new Error("Failed to fetch")
      const result = await res.json()
      setRequests(result.data || [])
    } catch {
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken, activeFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleReview = async (publicId: string, action: "APPROVE" | "REJECT") => {
    if (!session?.accessToken) return
    setReviewingId(publicId)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests/${publicId}/review`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            reviewerNotes: reviewNotes[publicId] || undefined,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to review")
      }
      await fetchRequests()
    } catch (err: any) {
      console.error("Review error:", err.message)
    } finally {
      setReviewingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{t("pending") || "Pending"}</Badge>
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800 border-green-300">{t("approved") || "Approved"}</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800 border-red-300">{t("rejected") || "Rejected"}</Badge>
      case "CANCELLED":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{t("cancelled") || "Cancelled"}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRequestTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      FULL_DAY: t("fullDay") || "Full Day",
      CHECK_IN_ONLY: t("checkInOnly") || "Check-in Only",
      CHECK_OUT_ONLY: t("checkOutOnly") || "Check-out Only",
      EDIT_EXISTING: t("editExisting") || "Edit Existing",
    }
    return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>
  }

  const getWorkerName = (req: ManualAttendanceRequest) => {
    const w = req.worker
    if (!w) return "Unknown"
    return w.user?.name || w.user?.firstName || w.code || `Worker #${w.id}`
  }

  const formatTime = (iso?: string) => {
    if (!iso) return "--:--"
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Madrid" })
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <AnimatedLoader size={24} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["PENDING", "all", "APPROVED", "REJECTED"] as const).map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={activeFilter === filter ? "default" : "outline"}
            onClick={() => setActiveFilter(filter)}
            className={activeFilter === filter ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            {filter === "all" ? (t("all") || "All") : (t(filter.toLowerCase()) || filter)}
            {filter === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 bg-white text-purple-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Requests list */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {activeFilter === "PENDING"
                ? (t("noPendingRequests") || "No pending requests")
                : (t("noRequestsFound") || "No requests found")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const isExpanded = expandedId === req.publicId
            const isPending = req.status === "PENDING"

            return (
              <Card key={req.publicId} className={`transition-all ${isPending ? "border-yellow-200" : ""}`}>
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(req.status)}
                        {getRequestTypeBadge(req.requestType)}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {getWorkerName(req)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {req.job?.jobName || "Unknown Job"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(req.requestedDate)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(req.requestedCheckIn)} - {formatTime(req.requestedCheckOut)}
                        </span>
                        {req.workCenter && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {req.workCenter.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : req.publicId)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {/* Reason */}
                      {req.reason && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t("reason") || "Reason"}</p>
                          <p className="text-sm bg-muted p-2.5 rounded-md">{req.reason}</p>
                        </div>
                      )}

                      {/* Worker notes */}
                      {req.workerNotes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t("additionalNotes") || "Additional Notes"}</p>
                          <p className="text-sm bg-muted p-2.5 rounded-md">{req.workerNotes}</p>
                        </div>
                      )}

                      {/* Submission info */}
                      <div className="text-xs text-muted-foreground">
                        {t("submittedBy") || "Submitted by"}: {req.requestedByUser?.name || req.requestedByRole} &middot;{" "}
                        {formatDate(req.createdAt)}
                      </div>

                      {/* Reviewer info (if already reviewed) */}
                      {req.reviewedAt && (
                        <div className="text-xs text-muted-foreground">
                          {t("reviewedBy") || "Reviewed by"}: {req.reviewedByUser?.name || req.reviewedByRole || "Unknown"} &middot;{" "}
                          {formatDate(req.reviewedAt)}
                          {req.reviewerNotes && (
                            <p className="mt-1 text-sm bg-muted p-2 rounded-md">{req.reviewerNotes}</p>
                          )}
                        </div>
                      )}

                      {/* Review actions (only for pending) */}
                      {isPending && (
                        <div className="pt-2 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {t("reviewerNotes") || "Reviewer Notes"} ({t("optional") || "optional"})
                            </p>
                            <Textarea
                              value={reviewNotes[req.publicId] || ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({ ...prev, [req.publicId]: e.target.value }))
                              }
                              placeholder={t("reviewerNotesPlaceholder") || "Add notes for the worker..."}
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleReview(req.publicId, "REJECT")}
                              disabled={reviewingId === req.publicId}
                            >
                              <X className="w-4 h-4 mr-1" />
                              {t("reject") || "Reject"}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleReview(req.publicId, "APPROVE")}
                              disabled={reviewingId === req.publicId}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              {t("approveAndRecord") || "Approve & Record"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
