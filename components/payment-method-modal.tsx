"use client"

import { useEffect, useState } from "react"
import { Loader2, CreditCard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { usePaymentMethods } from "@/hooks/use-payment-methods"

interface PaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Initial value (optional). The current employer's existing method, if any. */
  initialPaymentMethodId?: number | null
  /** Fired after a successful save with the new id and the (possibly flipped) status. */
  onSaved?: (result: { paymentMethodId: number; billingStatus: string }) => void
  /** Banner-mode: subtitle copy emphasizes "trial ended, add a method to continue." */
  trialEndedMode?: boolean
}

export function PaymentMethodModal({
  open,
  onOpenChange,
  initialPaymentMethodId,
  onSaved,
  trialEndedMode,
}: PaymentMethodModalProps) {
  const { t, tEnum } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [selectedId, setSelectedId] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const { methods: paymentMethods } = usePaymentMethods({
    selfServiceOnly: true,
    enabled: open,
  })

  // Re-seed the dropdown when the modal opens or the existing value changes.
  useEffect(() => {
    if (open) {
      setSelectedId(initialPaymentMethodId ? String(initialPaymentMethodId) : "")
    }
  }, [open, initialPaymentMethodId])

  const onSave = async () => {
    if (!session?.accessToken) return
    const id = Number(selectedId)
    if (!id) {
      toast({
        title: t("paymentMethodRequired") || "Please select a payment method",
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/me/payment-method`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentMethodId: id }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const json = await res.json()
      const billingStatus = json?.data?.billingStatus || ""
      toast({
        title: t("paymentMethodSaved") || "Payment method saved",
        variant: "success",
      })
      onSaved?.({ paymentMethodId: id, billingStatus })
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-[#6B21A8] flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">
                {t("paymentMethod") || "Payment method"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {trialEndedMode
                  ? t("paymentMethodTrialEndedDescription") ||
                    "Your trial has ended. Choose how you'd like to be billed to keep using ControlJobs."
                  : t("paymentMethodDescription") ||
                    "Choose how you'd like to be billed for monthly invoices."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <Label htmlFor="paymentMethod" className="text-xs font-medium">
            {t("paymentMethod") || "Payment method"} <span className="text-red-500">*</span>
          </Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger id="paymentMethod" className="h-9 text-sm">
              <SelectValue
                placeholder={t("selectPaymentMethod") || "Select a payment method"}
              />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {tEnum("paymentMethod", m.name) || m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving || !selectedId}
            className="bg-[#6B21A8] hover:bg-[#5b1d91] text-white gap-2"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("save") || "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
