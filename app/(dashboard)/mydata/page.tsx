"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Trash2, Upload, ImageIcon, CreditCard, Pencil } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { logoEndpointsFor } from "@/lib/logo-endpoints"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { PaymentMethodModal } from "@/components/payment-method-modal"

// Static lookup matching the backend `cjobs_payment_methods` seed (id 1..5).
// Used to label the current method on the /mydata Payment-method card.
const PAYMENT_METHOD_KEYS: Record<number, string> = {
  1: "TRANSFER",
  2: "DIRECT_DEBIT",
  3: "CARD",
  4: "PAYPAL",
  5: "OTHERS",
}

export default function MyDataPage() {
  const { t, tEnum } = useTranslation()
  const { session, getUserRole } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()
  const role = getUserRole()

  const endpoints = useMemo(() => logoEndpointsFor(role), [role])

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Employer-only payment-method panel. Loaded once when the role is
  // employer; the modal flips both billingStatus locally on save.
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [billingStatus, setBillingStatus] = useState<string | null>(null)
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)

  useEffect(() => {
    if (role !== "employer" || !session?.accessToken) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/me`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setPaymentMethodId(json?.data?.paymentMethodId ?? null)
          setBillingStatus(json?.data?.billingStatus ?? null)
        }
      } catch {
        /* swallow */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [role, session?.accessToken])

  useEffect(() => {
    if (!session?.accessToken || !endpoints) {
      setIsLoading(false)
      return
    }
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoints.read}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const result = await res.json()
          setLogoUrl(result?.data?.logoUrl ?? null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [session?.accessToken, endpoints?.read])

  const validateAndUpload = async (file: File) => {
    if (!session?.accessToken || !endpoints) return
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({
        title: t("logoMustBePngOrJpeg") || "Logo must be PNG or JPEG",
        variant: "destructive",
      })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("logoTooLarge") || "Logo must be 2 MB or smaller",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoints.logo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const result = await res.json()
      const newUrl = result?.data?.logoUrl ?? null
      setLogoUrl(newUrl)
      window.dispatchEvent(new CustomEvent("employer-logo-changed", { detail: { logoUrl: newUrl } }))
      toast({ title: t("logoUpdated") || "Logo updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const onPick = () => fileInputRef.current?.click()

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) await validateAndUpload(file)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isUploading) setIsDragging(true)
  }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (isUploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) await validateAndUpload(file)
  }

  const onDelete = async () => {
    if (!session?.accessToken || !logoUrl || !endpoints) return
    setIsUploading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoints.logo}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      setLogoUrl(null)
      window.dispatchEvent(new CustomEvent("employer-logo-changed", { detail: { logoUrl: null } }))
      toast({ title: t("logoRemoved") || "Logo removed", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) return <AnimatedLoader />

  if (!endpoints) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">{t("mydata") || "My Data"}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("mydataNotAvailableForRole") || "This page is only available for signed-in role accounts."}
        </p>
      </div>
    )
  }

  // Org roles brand documents with a "logo"; individuals (worker, admin)
  // use a personal "profile picture". Same upload mechanic underneath.
  const isPersonal = role === "worker" || role === "admin"
  const sectionTitle = isPersonal
    ? (t("profilePicture") || "Profile picture")
    : (t("companyLogo") || "Company logo")
  const sectionDesc = isPersonal
    ? (t("profilePictureDescription") || "Used as your avatar across the app.")
    : (t("companyLogoDescription") ||
        "This logo will appear on the bottom-left of every QR-code PDF you print for your work centers.")

  const currentPaymentMethodLabel =
    paymentMethodId && PAYMENT_METHOD_KEYS[paymentMethodId]
      ? tEnum("paymentMethod", PAYMENT_METHOD_KEYS[paymentMethodId]) ||
        PAYMENT_METHOD_KEYS[paymentMethodId]
      : null

  return (
    <div className="w-full p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("mydata") || "My Data"}</h1>
        <p className="text-sm text-muted-foreground">
          {t("mydataIntro") ||
            "Manage your profile and the branding that appears on documents you generate."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden max-w-3xl">
        <div className="p-6 border-b border-border bg-muted/20 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-[#6B21A8] flex items-center justify-center shrink-0">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {sectionTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {sectionDesc}
            </p>
          </div>
        </div>

        <div className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={onChange}
          />

          {logoUrl ? (
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="relative h-32 w-32 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t("logoCurrentlyActive") || "Logo currently active"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("logoCurrentlyActiveHint") ||
                    "It will print on every QR PDF you generate. Replace it any time."}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={onPick}
                    disabled={isUploading}
                    className="bg-[#6B21A8] hover:bg-[#5b1d91] text-white h-9 text-xs gap-2"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t("changeLogo") || "Change"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDelete}
                    disabled={isUploading}
                    className="h-9 text-xs gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("removeLogo") || "Remove logo"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPick}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              disabled={isUploading}
              className={`group w-full rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${
                isDragging
                  ? "border-[#6B21A8] bg-purple-50 dark:bg-purple-950/20"
                  : "border-muted-foreground/25 hover:border-[#6B21A8] hover:bg-purple-50/40 dark:hover:bg-purple-950/10"
              } ${isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-[#6B21A8] flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isUploading
                    ? (t("uploadingLogo") || "Uploading...")
                    : (t("dropzoneTitle") || "Click to upload or drag and drop")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("dropzoneSubtitle") || "PNG or JPEG, up to 2 MB"}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Payment method — employer role only. Reachable from here for
          changing it any time, and from the dashboard banner when the
          employer is sitting in AWAITING_PAYMENT_METHOD after trial-end. */}
      {role === "employer" && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden max-w-3xl">
          <div className="p-6 border-b border-border bg-muted/20 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-[#6B21A8] flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">
                {t("paymentMethod") || "Payment method"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("paymentMethodMyDataDescription") ||
                  "Used to bill your monthly invoices. You can change it any time."}
              </p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              {currentPaymentMethodLabel ? (
                <>
                  <span className="text-muted-foreground">
                    {t("currentPaymentMethod") || "Current method"}:
                  </span>{" "}
                  <span className="font-semibold text-foreground">
                    {currentPaymentMethodLabel}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  {t("noPaymentMethodSet") || "No payment method set yet."}
                </span>
              )}
              {billingStatus === "AWAITING_PAYMENT_METHOD" && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                  {tEnum("billingStatus", "AWAITING_PAYMENT_METHOD") ||
                    "Awaiting payment method"}
                </span>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setShowPaymentMethodModal(true)}
              className="bg-[#6B21A8] hover:bg-[#5b1d91] text-white h-9 text-xs gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              {currentPaymentMethodLabel
                ? t("changePaymentMethod") || "Change"
                : t("addPaymentMethod") || "Add payment method"}
            </Button>
          </div>
        </div>
      )}

      <PaymentMethodModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        initialPaymentMethodId={paymentMethodId}
        trialEndedMode={billingStatus === "AWAITING_PAYMENT_METHOD"}
        onSaved={({ paymentMethodId: newId, billingStatus: nextStatus }) => {
          setPaymentMethodId(newId)
          if (nextStatus) setBillingStatus(nextStatus)
        }}
      />
    </div>
  )
}
