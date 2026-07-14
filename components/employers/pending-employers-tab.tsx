"use client"

import { useCallback, useMemo, useState } from "react"
import { RefreshCw, X, Mail, Filter } from "lucide-react"
import DataListTemplate from "@/components/ui/data-list-template"
import { formatLocalDate } from "@/lib/datetime"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"

export type PendingStatus =
  | "INVITATION_SENT"
  | "EXPIRED"
  | "REVOKED"
  | "AWAITING_EMAIL_VERIFICATION"

export interface PendingItem {
  kind: "invitation" | "unverified"
  publicId: string
  email: string | null
  partnerId: number | null
  partnerName: string | null
  status: PendingStatus
  sentAt: string
  expiresAt: string | null
  description: string | null
  employerName: string | null
}

interface PendingEmployersTabProps {
  data: PendingItem[]
  isLoading: boolean
  onRefresh: () => void
  isAdmin: boolean
}

const STATUS_LABEL: Record<PendingStatus, string> = {
  INVITATION_SENT: "invitationSent",
  EXPIRED: "expiredInvitation",
  REVOKED: "revoked",
  AWAITING_EMAIL_VERIFICATION: "awaitingEmailVerification",
}

const STATUS_CLASS: Record<PendingStatus, string> = {
  INVITATION_SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  EXPIRED: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  REVOKED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  AWAITING_EMAIL_VERIFICATION:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
}

export default function PendingEmployersTab({
  data,
  isLoading,
  onRefresh,
  isAdmin,
}: PendingEmployersTabProps) {
  const { session } = useAuth()
  const { t } = useTranslation()

  const [resendTarget, setResendTarget] = useState<PendingItem | null>(null)
  const [resendEmail, setResendEmail] = useState("")
  const [resendBusy, setResendBusy] = useState(false)

  const openResendDialog = useCallback((row: PendingItem) => {
    setResendTarget(row)
    setResendEmail(row.email || "")
  }, [])

  const closeResendDialog = useCallback(() => {
    setResendTarget(null)
    setResendEmail("")
    setResendBusy(false)
  }, [])

  const submitResend = useCallback(async () => {
    if (!resendTarget) return
    const email = resendEmail.trim()
    if (!email) {
      toast({ title: t("invitationSendFailed"), description: t("emailRequired") || "Email required", variant: "destructive" })
      return
    }
    setResendBusy(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/${resendTarget.publicId}/resend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || "Resend failed")
      }
      toast({ title: t("invitationSentToast"), description: email, variant: "success" as any })
      closeResendDialog()
    } catch (e: any) {
      toast({ title: t("invitationSendFailed"), description: e?.message, variant: "destructive" })
    } finally {
      setResendBusy(false)
    }
  }, [resendTarget, resendEmail, session?.accessToken, t, closeResendDialog])

  const revokeInvitation = useCallback(
    async (row: PendingItem) => {
      if (!confirm(t("confirmRevokeInvitation"))) return
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/${row.publicId}/revoke`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session?.accessToken}` },
          },
        )
        if (!res.ok) throw new Error("Revoke failed")
        toast({ title: t("invitationRevokedToast"), variant: "success" as any })
        onRefresh()
      } catch (e: any) {
        toast({ title: t("invitationRevokeFailed"), description: e?.message, variant: "destructive" })
      }
    },
    [session?.accessToken, t, onRefresh],
  )

  const resendVerification = useCallback(
    async (row: PendingItem) => {
      if (!row.email) {
        toast({ title: t("verificationSendFailed"), description: t("emailRequired"), variant: "destructive" })
        return
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/resend-verification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: row.email }),
          },
        )
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.message || "Resend failed")
        }
        toast({ title: t("verificationSentToast"), description: row.email, variant: "success" as any })
      } catch (e: any) {
        toast({ title: t("verificationSendFailed"), description: e?.message, variant: "destructive" })
      }
    },
    [t],
  )

  const tableData = useMemo(
    () =>
      data.map((r) => ({
        id: r.publicId,
        email: r.email || "—",
        employerName: r.employerName || r.description || "—",
        partner: r.partnerName || "—",
        status: r.status,
        statusLabel: t(STATUS_LABEL[r.status]),
        sentAt: r.sentAt ? formatLocalDate(r.sentAt) : "—",
        expiresAt: r.expiresAt ? formatLocalDate(r.expiresAt) : "—",
        _raw: r,
      })),
    [data, t],
  )

  const actionButtons = useMemo(
    () => [
      {
        icon: Filter,
        onClick: () => {},
        title: t("filter"),
        type: "filter" as const,
      },
    ],
    [t],
  )

  const columns = useMemo(() => {
    const cols: Array<any> = [
      { key: "email", label: t("email"), sortable: true },
      { key: "employerName", label: t("name"), sortable: true },
    ]
    if (isAdmin) {
      cols.push({ key: "partner", label: t("partner"), sortable: true })
    }
    cols.push(
      {
        key: "status",
        label: t("status"),
        sortable: true,
        render: (value: PendingStatus) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[value]}`}
          >
            {t(STATUS_LABEL[value])}
          </span>
        ),
      },
      { key: "sentAt", label: t("sent"), sortable: true },
      { key: "expiresAt", label: t("expires"), sortable: true },
      {
        key: "_actions",
        label: t("actions") || "Acciones",
        align: "center" as const,
        width: "110px",
        sortable: false,
        render: (_: any, row: any) => {
          const raw: PendingItem = row._raw
          const slot = "inline-flex h-6 w-6 items-center justify-center"
          return (
            <div
              className="flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className={slot}>
                {raw.kind === "invitation" && raw.status === "INVITATION_SENT" ? (
                  <button
                    onClick={() => openResendDialog(raw)}
                    title={t("resendInvitation")}
                    className="p-1 text-muted-foreground hover:text-[#662D91] transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
              <span className={slot}>
                {raw.kind === "invitation" && raw.status === "INVITATION_SENT" ? (
                  <button
                    onClick={() => revokeInvitation(raw)}
                    title={t("revokeInvitation")}
                    className="p-1 text-foreground hover:text-amber-600 transition-colors"
                  >
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-current">
                      <X className="h-2.5 w-2.5 text-background" strokeWidth={3} />
                    </span>
                  </button>
                ) : null}
              </span>
              <span className={slot}>
                {raw.kind === "unverified" ? (
                  <button
                    onClick={() => resendVerification(raw)}
                    title={t("resendVerification")}
                    className="p-1 text-muted-foreground hover:text-[#662D91] transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
            </div>
          )
        },
      },
    )
    return cols
  }, [isAdmin, t, openResendDialog, revokeInvitation, resendVerification])

  return (
    <>
      <DataListTemplate
        title={t("pendingEmployers")}
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        actionButtons={actionButtons}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noPendingEmployers")}
      />

      <Dialog open={!!resendTarget} onOpenChange={(open) => !open && closeResendDialog()}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 gap-0 bg-background border-border mx-4">
          <DialogHeader className="p-4 sm:p-6 pb-4 space-y-4">
            <div className="flex items-center justify-between relative">
              <div className="flex-1" />
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <DialogTitle className="text-lg font-semibold text-foreground text-center tracking-tight">
                  {t("resendInvitation")}
                </DialogTitle>
              </div>
              <div className="flex-1 flex justify-end" />
            </div>
            {resendTarget && (resendTarget.description || resendTarget.partnerName) && (
              <DialogDescription className="text-center text-xs text-muted-foreground">
                {resendTarget.description && (
                  <span className="font-medium text-foreground">
                    {resendTarget.description}
                  </span>
                )}
                {resendTarget.description && resendTarget.partnerName && (
                  <span className="mx-1.5">·</span>
                )}
                {resendTarget.partnerName}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="px-4 sm:px-6 pb-4">
            <Label htmlFor="resend-email" className="text-sm font-medium text-foreground">
              {t("email")}
            </Label>
            <Input
              id="resend-email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="recipient@example.com"
              autoFocus
              className="mt-1"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("resendInvitationEmailPrompt")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
            <Button
              onClick={closeResendDialog}
              disabled={resendBusy}
              className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={submitResend}
              disabled={resendBusy || !resendEmail.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
            >
              {resendBusy ? t("sending") : t("send")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
