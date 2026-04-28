"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Copy, Send, Trash2, RefreshCw } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface Invitation {
  id: number
  publicId: string
  email: string
  partnerId: number
  partner?: { id: number; name: string }
  trialDays: number
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  expiresAt: string
  createdAt: string
  inviteLink?: string
}

interface PartnerOption {
  id: number
  name: string
}

const trialOptions = Array.from({ length: 31 }, (_, i) => i)

export default function InvitePage() {
  const { t, tEnum } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()

  const isAdmin = hasRole("admin")
  const isPartner = hasRole("partner")
  const canIssue = isAdmin || isPartner

  const [email, setEmail] = useState("")
  const [trialDays, setTrialDays] = useState("15")
  const [partnerId, setPartnerId] = useState<string>("")
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch partners (admin only — needs the dropdown)
  useEffect(() => {
    if (!isAdmin || !session?.accessToken) return
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          setPartners((json.data || []).map((p: any) => ({ id: p.id, name: p.name })))
        }
      } catch {
        /* ignore */
      }
    })()
  }, [isAdmin, session?.accessToken])

  const fetchInvitations = async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      )
      if (!res.ok) throw new Error("Failed to load")
      const json = await res.json()
      setInvitations(json.data || [])
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken])

  const send = async () => {
    if (!email) {
      toast({ title: t("emailRequired") || "Email required", variant: "destructive" })
      return
    }
    if (isAdmin && !partnerId) {
      toast({ title: t("selectPartner"), variant: "destructive" })
      return
    }
    setIsSending(true)
    try {
      const body: any = { email, trialDays: Number(trialDays) }
      if (isAdmin) body.partnerId = Number(partnerId)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || "Failed to send")
      }
      const json = await res.json()
      toast({ title: t("invitationSent") || "Invitation sent", variant: "success" as any })
      setEmail("")
      // Auto-copy the link for convenience
      const link = json?.data?.inviteLink
      if (link) {
        try {
          await navigator.clipboard.writeText(link)
          toast({ title: t("linkCopied") || "Link copied", variant: "success" as any })
        } catch {
          /* clipboard not allowed in some contexts */
        }
      }
      fetchInvitations()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const copyLink = async (link?: string) => {
    if (!link) {
      toast({
        title: t("noLinkAvailable") || "No link available for this invitation",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      toast({ title: t("linkCopied") || "Link copied", variant: "success" as any })
    } catch {
      // Fallback for browsers blocking clipboard — use a temp textarea.
      const ta = document.createElement("textarea")
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      toast({ title: t("linkCopied") || "Link copied", variant: "success" as any })
    }
  }

  const revoke = async (publicId: string) => {
    if (!confirm(t("confirmRevoke") || "Revoke this invitation?")) return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/${publicId}/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      )
      if (!res.ok) throw new Error("Failed to revoke")
      toast({ title: t("invitationRevoked") || "Invitation revoked", variant: "success" as any })
      fetchInvitations()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    }
  }

  const statusColor = (s: string) =>
    s === "PENDING"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      : s === "ACCEPTED"
        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
        : s === "EXPIRED"
          ? "bg-muted text-muted-foreground"
          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"

  if (!canIssue) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{t("noAccess") || "Access denied"}</p>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 bg-background min-h-screen w-full space-y-3">
      {/* Header */}
      <div className="bg-card border border-border rounded-md p-4">
        <h1 className="text-base sm:text-lg font-semibold text-foreground">
          {t("inviteEmployer") || "Invite employer"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("inviteEmployerSubtitle") ||
            "Send a signup link with a free trial period. The recipient completes the form themselves."}
        </p>
      </div>

      {/* Issue form */}
      <div className="bg-card border border-border rounded-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <Label className="text-xs font-medium text-foreground">{t("email")} *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@empresa.com"
              className="mt-1 h-9 text-xs"
            />
          </div>

          <div className="lg:col-span-3">
            <Label className="text-xs font-medium text-foreground">{t("probationPeriod")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Select value={trialDays} onValueChange={setTrialDays}>
                <SelectTrigger className="w-20 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {trialOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{t("days")}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="lg:col-span-3">
              <Label className="text-xs font-medium text-foreground">{t("partner")} *</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder={t("selectPartner")} />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div
            className={`flex items-end justify-stretch sm:justify-end col-span-1 sm:col-span-2 ${
              isAdmin ? "lg:col-span-1" : "lg:col-span-4"
            }`}
          >
            <Button
              onClick={send}
              disabled={isSending}
              className="h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              {t("sendInvite") || "Send invite"}
            </Button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {t("inviteHistory") || "Invitation history"}
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchInvitations} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" /> {t("refresh")}
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {t("noInvitesSent") || "No invitations sent yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">{t("email")}</th>
                {isAdmin && (
                  <th className="text-left px-3 py-2 font-semibold text-foreground">
                    {t("partner")}
                  </th>
                )}
                <th className="text-center px-3 py-2 font-semibold text-foreground">
                  {t("probationPeriod")}
                </th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">
                  {t("dateSent") || "Sent"}
                </th>
                <th className="text-left px-3 py-2 font-semibold text-foreground">
                  {t("expiresOn") || "Expires"}
                </th>
                <th className="text-center px-3 py-2 font-semibold text-foreground">
                  {t("status")}
                </th>
                <th className="text-center px-3 py-2 font-semibold text-foreground">
                  {t("link") || "Link"}
                </th>
                <th className="text-right px-3 py-2 font-semibold text-foreground">
                  {t("actions") || "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-2 text-foreground">{inv.email}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-foreground">{inv.partner?.name || `#${inv.partnerId}`}</td>
                  )}
                  <td className="text-center px-3 py-2 text-foreground">{inv.trialDays}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="text-center px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColor(inv.status)}`}>
                      {tEnum("invitationStatus", inv.status) || inv.status}
                    </span>
                  </td>
                  <td className="text-center px-3 py-2">
                    {inv.status === "PENDING" && inv.inviteLink ? (
                      <button
                        onClick={() => copyLink(inv.inviteLink)}
                        title={t("copyLink") || "Copy link"}
                        className="p-1 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </td>
                  <td className="text-right px-3 py-2">
                    {inv.status === "PENDING" && (
                      <button
                        onClick={() => revoke(inv.publicId)}
                        title={t("revoke") || "Revoke"}
                        className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
