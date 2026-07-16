"use client"

import { useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
  Inbox,
  CheckCircle2,
  XCircle,
  Hourglass,
  LogIn,
  LogOut,
  Edit3,
  CalendarDays,
  Building2,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import dynamic from "next/dynamic"
import { formatLocalTime, DEFAULT_TIMEZONE } from "@/lib/datetime"

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
    client?: {
      id?: number
      publicId?: string
      name?: string
    }
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

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED"

function MyAttendanceRequestsPage() {
  const { session } = useAuth()
  const { t } = useTranslation("manual-attendance")

  const userRole = (session as any)?.user?.role?.name?.toLowerCase() || ""
  const isWorker = userRole === "worker"
  const isClient = userRole === "client"

  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<StatusFilter>(isWorker ? "all" : "PENDING")
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const { data: requests = [], isLoading } = useQuery<ManualAttendanceRequest[]>({
    queryKey: ["manual-attendance", "my-requests", isWorker],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const endpoint = isWorker
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests/my`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/requests`
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch")
      const result = await res.json()
      return result.data || []
    },
  })
  const fetchMyRequests = () => queryClient.invalidateQueries({ queryKey: ["manual-attendance", "my-requests"] })

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

  const formatTime = (iso?: string) => {
    if (!iso) return "--:--"
    return formatLocalTime(iso)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: DEFAULT_TIMEZONE })
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

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case "FULL_DAY":
        return <CalendarDays className="w-3.5 h-3.5" />
      case "CHECK_IN_ONLY":
        return <LogIn className="w-3.5 h-3.5" />
      case "CHECK_OUT_ONLY":
        return <LogOut className="w-3.5 h-3.5" />
      case "EDIT_EXISTING":
        return <Edit3 className="w-3.5 h-3.5" />
      default:
        return <Clock className="w-3.5 h-3.5" />
    }
  }

  const statusStyles = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          border: "border-l-yellow-400",
          chip: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200",
          label: t("pending") || "Pending",
          icon: <Hourglass className="w-3 h-3 mr-1" />,
        }
      case "APPROVED":
        return {
          border: "border-l-green-500",
          chip: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200",
          label: t("approved") || "Approved",
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        }
      case "REJECTED":
        return {
          border: "border-l-red-500",
          chip: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200",
          label: t("rejected") || "Rejected",
          icon: <XCircle className="w-3 h-3 mr-1" />,
        }
      case "CANCELLED":
        return {
          border: "border-l-gray-400",
          chip: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
          label: t("cancelled") || "Cancelled",
          icon: <X className="w-3 h-3 mr-1" />,
        }
      default:
        return {
          border: "border-l-border",
          chip: "bg-muted text-muted-foreground",
          label: status,
          icon: null,
        }
    }
  }

  const stats = useMemo(() => {
    const counts = { all: requests.length, PENDING: 0, APPROVED: 0, REJECTED: 0 }
    for (const r of requests) {
      if (r.status === "PENDING") counts.PENDING++
      else if (r.status === "APPROVED") counts.APPROVED++
      else if (r.status === "REJECTED") counts.REJECTED++
    }
    return counts
  }, [requests])

  const filtered = activeFilter === "all"
    ? requests
    : requests.filter((r) => r.status === activeFilter)

  const filterOptions: { value: StatusFilter; label: string; count: number; accent: string }[] = [
    { value: "all", label: t("all") || "All", count: stats.all, accent: "data-[active=true]:bg-purple-600 data-[active=true]:text-white data-[active=true]:border-purple-600" },
    { value: "PENDING", label: t("pending") || "Pending", count: stats.PENDING, accent: "data-[active=true]:bg-yellow-500 data-[active=true]:text-white data-[active=true]:border-yellow-500" },
    { value: "APPROVED", label: t("approved") || "Approved", count: stats.APPROVED, accent: "data-[active=true]:bg-green-600 data-[active=true]:text-white data-[active=true]:border-green-600" },
    { value: "REJECTED", label: t("rejected") || "Rejected", count: stats.REJECTED, accent: "data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600" },
  ]

  const statCards = [
    { label: t("total") || "Total", value: stats.all, Icon: FileText },
    { label: t("pending") || "Pending", value: stats.PENDING, Icon: Hourglass },
    { label: t("approved") || "Approved", value: stats.APPROVED, Icon: CheckCircle2 },
    { label: t("rejected") || "Rejected", value: stats.REJECTED, Icon: XCircle },
  ]

  return (
    <div className="px-4 md:px-6 pt-2 pb-4 md:pb-6 bg-background min-h-screen w-full">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
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

          {isWorker && (
            <Button
              onClick={() => setShowRequestForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t("newRequest") || "New Request"}
            </Button>
          )}
        </div>

        {/* Stat cards (match dashboard analysis cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <Card
              key={s.label}
              className="border border-border hover:shadow-md transition-all duration-300 hover:scale-105 group bg-card"
            >
              <CardContent className="p-3">
                <div className="w-full h-0.5 bg-[#6B7280] rounded-full mb-2"></div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[#6B7280] group-hover:scale-110 transition-transform duration-300">
                    <s.Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                      {s.value}
                    </div>
                  </div>
                </div>
                <div className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">
                  {s.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => {
            const active = activeFilter === opt.value
            return (
              <button
                key={opt.value}
                data-active={active}
                onClick={() => setActiveFilter(opt.value)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-medium transition-colors
                  border-border bg-background text-muted-foreground hover:bg-muted
                  ${opt.accent}`}
              >
                <span>{opt.label}</span>
                <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-semibold
                  ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {opt.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <AnimatedLoader size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                {t("noRequestsFound") || "No requests found"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {isWorker
                  ? (t("noRequestsFoundDesc") || "Create a manual attendance request when you need to log time you couldn't check in or out for.")
                  : (t("noRequestsToReviewDesc") || "There are no attendance requests matching this filter.")}
              </p>
              {isWorker && (
                <Button
                  onClick={() => setShowRequestForm(true)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {t("newRequest") || "New Request"}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const s = statusStyles(req.status)
              const workerName = getWorkerName(req)
              return (
                <Card
                  key={req.publicId}
                  className={`border-l-4 ${s.border} transition-shadow hover:shadow-sm`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        {/* Header chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`inline-flex items-center ${s.chip}`}>
                            {s.icon}
                            {s.label}
                          </Badge>
                          <Badge variant="outline" className="inline-flex items-center gap-1 text-xs font-normal">
                            {getRequestTypeIcon(req.requestType)}
                            {getRequestTypeLabel(req.requestType)}
                          </Badge>
                          {!isWorker && workerName && (
                            <Badge variant="outline" className="inline-flex items-center gap-1 text-xs font-normal bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50">
                              <User className="w-3 h-3" />
                              {workerName}
                            </Badge>
                          )}
                          {!isClient && req.job?.client?.name && (
                            <Badge variant="outline" className="inline-flex items-center gap-1 text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50">
                              <Building2 className="w-3 h-3" />
                              {req.job.client.name}
                            </Badge>
                          )}
                        </div>

                        {/* Inline metadata */}
                        <div className="mt-2 flex items-center gap-x-4 gap-y-1 text-sm text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(req.requestedDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(req.requestedCheckIn)} <span className="opacity-60">→</span> {formatTime(req.requestedCheckOut)}
                          </span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <FileText className="w-3.5 h-3.5" />
                            {req.job?.jobName || (t("unknownJob") || "Unknown Job")}
                          </span>
                          {req.workCenter && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5" />
                              {req.workCenter.name}
                            </span>
                          )}
                        </div>

                        {/* Reason */}
                        {req.reason && (
                          <p className="mt-1.5 text-sm text-foreground">
                            <span className="text-muted-foreground">{t("reason") || "Reason"}:</span> {req.reason}
                          </p>
                        )}

                        {/* Rejection notes */}
                        {req.status === "REJECTED" && req.reviewerNotes && (
                          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 inline-flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{req.reviewerNotes}</span>
                          </p>
                        )}

                        {/* Approved meta */}
                        {req.status === "APPROVED" && (
                          <p className="mt-1.5 text-xs text-green-700 dark:text-green-400">
                            {t("approvedBy") || "Approved by"}: {req.reviewedByUser?.name || (t("employer") || "Employer")}
                            {req.reviewedAt && <> · {formatDate(req.reviewedAt)}</>}
                          </p>
                        )}

                        {/* Submitted */}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("submitted") || "Submitted"}: {formatDate(req.createdAt)}
                        </p>
                      </div>

                      {req.status === "PENDING" && isWorker && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleCancel(req.publicId)}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          {t("cancel") || "Cancel"}
                        </Button>
                      )}
                    </div>

                    {/* Employer/Client review panel */}
                    {!isWorker && req.status === "PENDING" && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row gap-2 items-stretch">
                        <Textarea
                          value={reviewNotes[req.publicId] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [req.publicId]: e.target.value }))
                          }
                          placeholder={t("reviewerNotesPlaceholder") || "Add notes (optional)..."}
                          rows={1}
                          className="resize-none text-sm flex-1 min-h-[36px]"
                        />
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleReview(req.publicId, "REJECT")}
                            disabled={reviewingId === req.publicId}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t("reject") || "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
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
              )
            })}
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
