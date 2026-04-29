"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
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
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const trialOptions = Array.from({ length: 31 }, (_, i) => i)

export default function BulkInvitationModal({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const { t } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const isAdmin = hasRole("admin")

  const [description, setDescription] = useState("")
  const [discountPercent, setDiscountPercent] = useState("10")
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
          setPartners((json.data || []).map((p: any) => ({ id: p.id, name: p.name })))
        }
      } catch {
        /* ignore */
      }
    })()
  }, [open, isAdmin, session?.accessToken])

  // Reset whenever the dialog opens so an old draft doesn't leak in.
  useEffect(() => {
    if (open) {
      setDescription("")
      setDiscountPercent("10")
      setTrialDays("15")
      setPartnerId("")
      setExpiresAt("")
    }
  }, [open])

  const create = async () => {
    if (!description.trim()) {
      toast({
        title: t("descriptionRequired") || "Description is required",
        variant: "destructive",
      })
      return
    }
    if (isAdmin && !partnerId) {
      toast({ title: t("selectPartner") || "Select a partner", variant: "destructive" })
      return
    }
    const discountNum = Number(discountPercent)
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast({
        title: t("invalidDiscount") || "Discount must be 0–100",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const body: any = {
        description: description.trim(),
        discountPercent: discountNum,
        trialDays: Number(trialDays),
      }
      if (isAdmin) body.partnerId = Number(partnerId)
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString()

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
        throw new Error(errJson?.message || "Failed to create")
      }
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
            {t("createInvitation") || "Create invitation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isAdmin && (
            <div>
              <Label className="text-xs font-medium text-foreground">
                {t("partner") || "Partner"} *
              </Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue
                    placeholder={t("selectPartner") || "Select partner"}
                  />
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

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("discount") || "Descuento"} *
            </Label>
            <div className="flex items-center gap-1 mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="h-9 text-xs w-full"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("probationPeriod") || "Período de prueba"}
            </Label>
            <div className="flex items-center gap-1 mt-1">
              <Select value={trialDays} onValueChange={setTrialDays}>
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
                allowPastDates
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
          <Button onClick={create} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            {t("create") || "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
