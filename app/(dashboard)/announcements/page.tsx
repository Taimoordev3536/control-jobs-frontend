"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { History, Info } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { DateInput } from "@/components/ui/date-input"
import { TimePicker } from "@/components/ui/time-picker"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime, madridWallClockToISO } from "@/lib/datetime"
import ReceivedAnnouncements from "@/components/announcements/received-announcements"

type Severity = "INFO" | "WARNING" | "CRITICAL"
type Audience = { segment: string; count: number }
type Status = "SENT" | "SCHEDULED" | "CANCELLED" | "FAILED"
type HistoryItem = {
  publicId: string
  subject: string
  body: string
  severity: Severity
  segments: string[]
  status: Status
  scheduledAt: string | null
  sentAt: string | null
  recipientCount: number | null
  createdAt: string
}

export default function AnnouncementsPage() {
  const { getUserRole } = useAuth()
  const r = getUserRole()
  if (r === "worker" || r === "client") return <ReceivedAnnouncements />
  return <AnnouncementsManageView />
}

function AnnouncementsManageView() {
  const { t } = useTranslation("announcements")
  const { getUserRole } = useAuth()
  const queryClient = useQueryClient()
  const [role, setRole] = useState<string | null>(null)

  const [selected, setSelected] = useState<string[]>([])
  const [severity, setSeverity] = useState<Severity>("INFO")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [scheduleLater, setScheduleLater] = useState(false)
  const [schedDate, setSchedDate] = useState("")
  const [schedTime, setSchedTime] = useState("")
  const [reach, setReach] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setRole(getUserRole())
  }, [getUserRole])

  const allowed = role === "admin" || role === "partner" || role === "employer"

  const { data: audiences = [], isLoading: audiencesLoading } = useQuery<Audience[]>({
    queryKey: ["announcements", "audiences"],
    enabled: allowed,
    queryFn: async () => {
      const res = await apiFetch<{ data: Audience[] }>("/announcements/audiences")
      return res.data || []
    },
  })

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["announcements", "history"],
    enabled: allowed,
    queryFn: async () => {
      const res = await apiFetch<{ data: { items: HistoryItem[] } }>("/announcements")
      return res.data?.items || []
    },
  })
  // Send/cancel refresh the sent-history list.
  const loadHistory = () => queryClient.invalidateQueries({ queryKey: ["announcements", "history"] })

  useEffect(() => {
    if (selected.length === 0) {
      setReach(null)
      return
    }
    let cancelled = false
    apiFetch<{ data: { recipientCount: number } }>("/announcements/preview", {
      method: "POST",
      body: { segments: selected },
    })
      .then((res) => {
        if (!cancelled) setReach(res.data?.recipientCount ?? null)
      })
      .catch(() => {
        if (!cancelled) setReach(null)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  const toggleSegment = (segment: string) => {
    setSelected((prev) =>
      prev.includes(segment)
        ? prev.filter((s) => s !== segment)
        : [...prev, segment],
    )
  }

  const formatTime = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 4)
    return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
  }

  const tip = (text: string) => (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
            <Info tabIndex={-1} className="h-3 w-3 cursor-help text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[18rem] px-2 py-1 text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  const submit = async () => {
    if (selected.length === 0) {
      toast({ title: t("selectAudienceError"), variant: "destructive" })
      return
    }
    let scheduledAt: string | undefined
    if (scheduleLater) {
      if (!schedDate || !schedTime) {
        toast({ title: t("futureTimeError"), variant: "destructive" })
        return
      }
      scheduledAt = madridWallClockToISO(schedDate, schedTime)
      if (isNaN(new Date(scheduledAt).getTime()) || new Date(scheduledAt).getTime() <= Date.now()) {
        toast({ title: t("futureTimeError"), variant: "destructive" })
        return
      }
    }
    setSubmitting(true)
    try {
      await apiFetch("/announcements", {
        method: "POST",
        body: { segments: selected, subject, body, severity, scheduledAt },
      })
      toast({
        title: scheduledAt ? t("scheduledToast") : t("sentToast"),
        variant: "success",
      })
      setSubject("")
      setBody("")
      setSelected([])
      setSeverity("INFO")
      setScheduleLater(false)
      setSchedDate("")
      setSchedTime("")
      setReach(null)
      loadHistory()
    } catch (e: any) {
      toast({
        title: t("errorToast"),
        description: e?.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const cancelScheduled = async (publicId: string) => {
    if (!window.confirm(t("confirmCancel"))) return
    try {
      await apiFetch(`/announcements/${publicId}`, { method: "DELETE" })
      toast({ title: t("cancelledToast"), variant: "success" })
      loadHistory()
    } catch (e: any) {
      toast({
        title: t("errorToast"),
        description: e?.message,
        variant: "destructive",
      })
    }
  }

  if (role === null) return null
  if (!allowed) {
    return (
      <div className="w-full p-8 text-muted-foreground">
        {t("notAuthorized")}
      </div>
    )
  }

  const canSubmit =
    selected.length > 0 && subject.trim() && body.trim() && !submitting

  return (
    <div className="w-full space-y-6 p-6">
      <h1 className="text-center text-2xl font-semibold text-foreground">
        {t("announcements")}
      </h1>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start">
            <div className="space-y-2">
              <Label className="flex h-5 items-center gap-1 text-xs font-medium text-foreground">
                {t("audience")} {tip(t("reachesUnknown"))}
              </Label>
              <div className="flex flex-wrap gap-3">
                {audiencesLoading ? (
                  <AnimatedLoader size={24} className="py-2" />
                ) : (
                  audiences.map((a) => {
                  const on = selected.includes(a.segment)
                  return (
                    <label
                      key={a.segment}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        on
                          ? "border-[#662D91] bg-[#662D91]/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox
                        checked={on}
                        onCheckedChange={() => toggleSegment(a.segment)}
                      />
                      <span className="text-sm">{t(a.segment)}</span>
                      <Badge variant="secondary" className="font-medium">
                        {a.count}
                      </Badge>
                    </label>
                    )
                  })
                )}
              </div>
              {reach !== null && (
                <p className="text-xs text-muted-foreground">
                  {t("reaches", { count: reach })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex h-5 items-center gap-1 text-xs font-medium text-foreground">
                {t("severity")}
              </Label>
              <div className="max-w-xs">
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as Severity)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">{t("INFO")}</SelectItem>
                    <SelectItem value="WARNING">{t("WARNING")}</SelectItem>
                    <SelectItem value="CRITICAL">{t("CRITICAL")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">
              {t("subject")}
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subjectPlaceholder")}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">
              {t("message")}
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("messagePlaceholder")}
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">
              {t("whenToSend")}
            </Label>
            <div className="flex min-h-[40px] flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-[#662D91]"
                  checked={!scheduleLater}
                  onChange={() => setScheduleLater(false)}
                />
                {t("sendNow")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-[#662D91]"
                  checked={scheduleLater}
                  onChange={() => setScheduleLater(true)}
                />
                {t("scheduleForLater")}
              </label>
              {scheduleLater && (
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <DateInput
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                    />
                  </div>
                  <div className="relative w-24">
                    <Input
                      value={schedTime}
                      placeholder="--:--"
                      inputMode="numeric"
                      maxLength={5}
                      onChange={(e) => setSchedTime(formatTime(e.target.value))}
                      className="pr-8 text-center"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <TimePicker
                        value={schedTime}
                        onChange={(time) => setSchedTime(time)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={submit} disabled={!canSubmit}>
              {submitting
                ? t("sending")
                : scheduleLater
                  ? t("schedule")
                  : t("send")}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 border-b border-border bg-muted/20 p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[#6B21A8] dark:bg-purple-950/40">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{t("history")}</h2>
          </div>
        </div>

        <div className="p-6">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((h) => (
                <div key={h.publicId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{h.subject}</span>
                      <StatusBadge status={h.status} label={t(`status${h.status}`)} />
                      {h.severity === "CRITICAL" && (
                        <Badge variant="destructive">{t("CRITICAL")}</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {h.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.segments.map((s) => t(s)).join(" · ")}
                      {h.status === "SCHEDULED" && h.scheduledAt
                        ? ` — ${formatLocalDateTime(h.scheduledAt)}`
                        : h.sentAt
                          ? ` — ${formatLocalDateTime(h.sentAt)}`
                          : ""}
                      {typeof h.recipientCount === "number"
                        ? ` · ${h.recipientCount} ${t("recipients")}`
                        : ""}
                    </p>
                  </div>
                  {h.status === "SCHEDULED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelScheduled(h.publicId)}
                    >
                      {t("cancelScheduled")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, label }: { status: Status; label: string }) {
  const variant =
    status === "SENT"
      ? "default"
      : status === "SCHEDULED"
        ? "secondary"
        : status === "FAILED"
          ? "destructive"
          : "outline"
  return <Badge variant={variant}>{label}</Badge>
}
