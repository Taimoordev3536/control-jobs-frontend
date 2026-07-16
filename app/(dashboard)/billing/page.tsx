"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import EmployerBillingTab from "@/components/employer-tabs/employer-billing-tab"
import { AnimatedLoader } from "@/components/animated-loader"

export default function BillingPage() {
  const { session, hasRole } = useAuth()
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [billingStatus, setBillingStatus] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const { data: me } = useQuery<{ id: number | null; billingStatus: string | null }>({
    queryKey: ["employers", "me", "billing"],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const r = await apiFetch<{ data: { id: number; billingStatus?: string } }>("/employers/me")
      return { id: r?.data?.id ?? null, billingStatus: r?.data?.billingStatus || null }
    },
  })
  const employerId = me?.id != null ? String(me.id) : null

  // Local state so cancelSubscription can optimistically flip to CANCELLED;
  // seeded from the query once loaded.
  useEffect(() => {
    if (me) setBillingStatus(me.billingStatus)
  }, [me])

  const cancelSubscription = async () => {
    if (!confirm(t("confirmCancelSubscription") || "Cancel your subscription? You'll keep access until the end of the current billing period.")) return
    setIsCancelling(true)
    try {
      await apiFetch("/employers/me/cancel", { method: "POST" })
      toast({
        title: t("subscriptionCancelled") || "Subscription cancelled",
        variant: "success" as any,
      })
      setBillingStatus("CANCELLED")
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIsCancelling(false)
    }
  }

  if (!hasRole("employer")) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {t("billingViewedFromEmployerDetail") ||
            "Open an employer to view their billing."}
        </p>
      </div>
    )
  }

  if (!employerId) return <AnimatedLoader />

  const cancelSlot =
    billingStatus === "CANCELLED" ? (
      <div className="mx-2 mt-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200">
        {t("subscriptionCancelledNotice") ||
          "Your subscription is cancelled. No further invoices will be issued."}
      </div>
    ) : (
      <div className="mx-2 mt-2 rounded-md border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {t("cancelSubscription") || "Cancel subscription"}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("cancelSubscriptionExplain") ||
              "Stop future billing. Past invoices remain unchanged."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={cancelSubscription}
          disabled={isCancelling}
          className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          {isCancelling
            ? t("cancelling") || "Cancelling..."
            : t("cancelSubscription") || "Cancel subscription"}
        </Button>
      </div>
    )

  return (
    <div className="w-full">
      <EmployerBillingTab employerId={employerId} slotAfterRateCards={cancelSlot} />
    </div>
  )
}
