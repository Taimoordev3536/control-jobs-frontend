"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import DateInput from "@/components/ui/date-input"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface PartnerOption {
  id: number
  name: string
  commission: number
  isSystem: boolean
}

interface InvitationToEdit {
  publicId: string
  description: string
  partnerId: number
  partnerName?: string
  discountPercent: number | string
  trialDays: number | string
  expiresAt?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  invitation?: InvitationToEdit | null
}

const trialOptions = Array.from({ length: 31 }, (_, i) => i)

export default function BulkInvitationModal({
  open,
  onOpenChange,
  onCreated,
  invitation,
}: Props) {
  const isEditMode = !!invitation
  const { t } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const isAdmin = hasRole("admin")

  const [description, setDescription] = useState("")
  const [discountPercent, setDiscountPercent] = useState("0")
  const [trialDays, setTrialDays] = useState("15")
  const [partnerId, setPartnerId] = useState<string>("")
  const [expiresAt, setExpiresAt] = useState<string>("")
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Load partner options once for admins.
  useEffect(() => {
    if (!open || !isAdmin || !session?.accessToken) return
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          setPartners(
            (json.data || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              commission: Number(p.commission ?? 0),
              isSystem: p.taxId === "SYSTEM",
            })),
          )
        }
      } catch {
        /* ignore */
      }
    })()
  }, [open, isAdmin, session?.accessToken])

  // Reset whenever the dialog opens so an old draft doesn't leak in. In edit
  // mode, prefill from the invitation being edited.
  useEffect(() => {
    if (!open) return
    if (invitation) {
      setDescription(invitation.description ?? "")
      setDiscountPercent(String(invitation.discountPercent ?? "0"))
      setTrialDays(String(invitation.trialDays ?? "15"))
      setPartnerId(String(invitation.partnerId ?? ""))
      setExpiresAt(
        invitation.expiresAt
          ? new Date(invitation.expiresAt).toISOString().slice(0, 10)
          : "",
      )
    } else {
      setDescription("")
      setDiscountPercent("0")
      setTrialDays("15")
      setPartnerId("")
      setExpiresAt("")
    }
  }, [open, invitation])

  const submit = async () => {
    if (!description.trim()) {
      toast({
        title: t("descriptionRequired") || "Description is required",
        variant: "destructive",
      })
      return
    }
    if (!isEditMode && isAdmin && !partnerId) {
      toast({ title: t("selectPartner") || "Select a partner", variant: "destructive" })
      return
    }
    const discountNum = discountPercent === "" ? 0 : Number(discountPercent)
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast({
        title: t("invalidDiscount") || "Discount must be 0–100",
        variant: "destructive",
      })
      return
    }
    if (isAdmin) {
      const selected = partners.find((p) => String(p.id) === partnerId)
      if (selected && !selected.isSystem && discountNum > selected.commission) {
        toast({
          title:
            t("discountExceedsCommission", { cap: selected.commission }) ||
            `El descuento no puede exceder la comisión del ${selected.commission}%`,
          variant: "destructive",
        })
        return
      }
    }
    if (expiresAt) {
      const picked = new Date(expiresAt)
      picked.setHours(23, 59, 59, 999)
      if (picked.getTime() <= Date.now()) {
        toast({
          title:
            t("expiryMustBeFuture") ||
            "La fecha de caducidad debe ser posterior a la fecha actual",
          variant: "destructive",
        })
        return
      }
    }

    setIsCreating(true)
    try {
      const url = isEditMode
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/${invitation!.publicId}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations`
      const method = isEditMode ? "PATCH" : "POST"

      const body: any = {
        description: description.trim(),
        discountPercent: discountNum,
        trialDays: Number(trialDays),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      if (!isEditMode && isAdmin) body.partnerId = Number(partnerId)

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || (isEditMode ? "Failed to update" : "Failed to create"))
      }

      if (isEditMode) {
        toast({
          title: t("invitationUpdated") || "Invitation updated",
          variant: "success" as any,
        })
      } else {
        const json = await res.json()
        const link = json?.data?.inviteLink
        if (link) {
          try {
            await navigator.clipboard.writeText(link)
            toast({
              title: t("linkCreatedAndCopied") || "Link created and copied",
              variant: "success" as any,
            })
          } catch {
            toast({
              title: t("linkCreated") || "Link created",
              variant: "success" as any,
            })
          }
        }
      }
      onCreated?.()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
            {isEditMode
              ? t("editInvitation") || "Edit invitation"
              : t("createInvitation") || "Create invitation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isAdmin && (
            <div>
              <Label className="text-xs font-medium text-foreground">
                {t("partner") || "Partner"} {!isEditMode && "*"}
              </Label>
              <Select
                value={partnerId}
                onValueChange={setPartnerId}
                disabled={isEditMode}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue
                    placeholder={t("selectPartner") || "Select partner"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {isEditMode
                    ? invitation?.partnerName
                      ? (
                          <SelectItem value={String(invitation.partnerId)}>
                            {invitation.partnerName}
                          </SelectItem>
                        )
                      : null
                    : partners.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("discount") || "Descuento"}
            </Label>
            <div className="flex items-center gap-1 mt-1">
              <Input
                type="text"
                inputMode="numeric"
                value={discountPercent}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 3)
                  if (digits === "") {
                    setDiscountPercent("")
                    return
                  }
                  const n = Number(digits)
                  setDiscountPercent(n > 100 ? "100" : digits)
                }}
                className="h-9 text-xs w-24"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("probationPeriod") || "Período de prueba"}
            </Label>
            <div className="flex items-center gap-1 mt-1">
              <Select
                value={trialDays}
                onValueChange={setTrialDays}
              >
                <SelectTrigger className="h-9 text-xs w-24">
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
              <span className="text-xs text-muted-foreground">
                {t("days") || "días"}
              </span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("expiry") || "Caducidad"}
            </Label>
            <div className="mt-1">
              <DateInput
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("description") || "Descripción"} *
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                t("descriptionPlaceholder") || "e.g. Spring promo, Group A"
              }
              rows={3}
              className="mt-1 text-xs resize-none"
              maxLength={255}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            {t("cancel") || "Cancel"}
          </Button>
          <Button onClick={submit} disabled={isCreating}>
            {isCreating && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            )}
            {isEditMode
              ? t("save") || "Guardar"
              : t("create") || "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
