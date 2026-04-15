"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedLoader } from "@/components/animated-loader"
import {
  Clock,
  Calendar,
  FileText,
  MapPin,
  Plus,
  AlertCircle,
  Check,
  X,
  User,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import dynamic from "next/dynamic"

const ManualAttendanceRequestForm = dynamic(
  () => import("@/components/manual-attendance/manual-attendance-request-form"),
  { ssr: false }
)

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
  workCenter?: {
    id: number
    name?: string
  }
  reviewedByUser?: {
    name?: string
    firstName?: string
    lastName?: string
  }
}

function MyAttendanceRequestsPage() {
  const { session } = useAuth()
  const { t } = useTranslation()

  const userRole = (session as any)?.user?.role?.name?.toLowerCase() || ""
  const isWorker = userRole === "worker"

  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<ManualAttendanceRequest[]>([])
  const [activeFilter, setActiveFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">(isWorker ? "all" : "PENDING")
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const fetchMyRequests = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      // Workers use /requests/my, employers/clients use /requests (scoped by role on backend)
      const endpoint = isWorker
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests/my`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests`

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch")
      const result = await res.json()
      setRequests(result.data || [])
    } catch {
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken, isWorker])

  useEffect(() => {
    fetchMyRequests()
  }, [fetchMyRequests])

  const handleCancel = async (publicId: string) => {
    if (!session?.accessToken) return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests/${publicId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!res.ok) throw new Error("Failed to cancel")
      await fetchMyRequests()
    } catch (err: any) {
      console.error("Cancel error:", err.message)
    }
  }

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
        console.error("Review error:", err.message)
      }
      await fetchMyRequests()
    } catch (err: any) {
      console.error("Review error:", err.message)
    } finally {
      setReviewingId(null)
    }
  }

  const getWorkerName = (req: ManualAttendanceRequest) => {
    const w = (req as any).worker
    if (!w) return ""
    return w.user?.name || w.user?.firstName || w.code || `Worker #${w.id}`
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

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FULL_DAY: t("fullDay") || "Full Day",
      CHECK_IN_ONLY: t("checkInOnly") || "Check-in Only",
      CHECK_OUT_ONLY: t("checkOutOnly") || "Check-out Only",
      EDIT_EXISTING: t("editExisting") || "Edit Existing",
    }
    return labels[type] || type
  }

  const formatTime = (iso?: string) => {
    if (!iso) return "--:--"
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
  }

  const filtered = activeFilter === "all"
    ? requests
    : requests.filter((r) => r.status === activeFilter)

  return (
    <div className="p-4 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {isWorker
                ? (t("myAttendanceRequests") || "My Attendance Requests")
                : (t("attendanceRequests") || "Attendance Requests")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isWorker
                ? (t("myAttendanceRequestsDesc") || "Track your manual attendance requests and their status")
                : (t("attendanceRequestsDesc") || "Review and manage worker attendance requests")}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={activeFilter === filter ? "default" : "outline"}
              onClick={() => setActiveFilter(filter)}
              className={activeFilter === filter ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {filter === "all" ? (t("all") || "All") : (t(filter.toLowerCase()) || filter)}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <AnimatedLoader size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("noRequestsFound") || "No requests found"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <Card key={req.publicId} className={req.status === "PENDING" ? "border-yellow-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Status + type */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(req.status)}
                        <Badge variant="outline" className="text-xs">
                          {getRequestTypeLabel(req.requestType)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(req.requestedDate)}
                        </span>
                      </div>

                      {/* Job + times */}
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {req.job?.jobName || "Unknown Job"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(req.requestedCheckIn)} - {formatTime(req.requestedCheckOut)}
                        </span>
                        {req.workCenter && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {req.workCenter.name}
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      {req.reason && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t("reason") || "Reason"}: {req.reason}
                        </p>
                      )}

                      {/* Review info */}
                      {req.status === "REJECTED" && req.reviewerNotes && (
                        <Card className="mt-2 bg-red-50 dark:bg-red-950/30 border-red-200">
                          <CardContent className="p-2.5">
                            <p className="text-xs text-red-600">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              {req.reviewerNotes}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {req.status === "APPROVED" && (
                        <p className="mt-2 text-xs text-green-600">
                          {t("approvedBy") || "Approved by"}: {req.reviewedByUser?.name || "Employer"} &middot;{" "}
                          {formatDate(req.reviewedAt)}
                        </p>
                      )}

                      {/* Submitted date */}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("submitted") || "Submitted"}: {formatDate(req.createdAt)}
                      </p>
                    </div>

                    {/* Actions - different for worker vs employer/client */}
                    {req.status === "PENDING" && isWorker && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancel(req.publicId)}
                      >
                        {t("cancel") || "Cancel"}
                      </Button>
                    )}
                  </div>

                  {/* Employer/Client: Worker name + Approve/Reject actions for pending requests */}
                  {!isWorker && req.status === "PENDING" && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      {/* Worker name */}
                      {getWorkerName(req) && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium">{getWorkerName(req)}</span>
                        </div>
                      )}

                      {/* Reviewer notes input */}
                      <Textarea
                        value={reviewNotes[req.publicId] || ""}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({ ...prev, [req.publicId]: e.target.value }))
                        }
                        placeholder={t("reviewerNotesPlaceholder") || "Add notes (optional)..."}
                        rows={2}
                        className="resize-none text-sm"
                      />

                      {/* Approve / Reject buttons */}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request form modal */}
      <ManualAttendanceRequestForm
        open={showRequestForm}
        onOpenChange={setShowRequestForm}
        mode="request"
        onSuccess={fetchMyRequests}
      />
    </div>
  )
}

export default dynamic(() => Promise.resolve(MyAttendanceRequestsPage), { ssr: false })
