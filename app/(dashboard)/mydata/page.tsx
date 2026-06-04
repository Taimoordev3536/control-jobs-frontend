"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Trash2, Upload, ImageIcon, UserCircle2, CreditCard, Pencil } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { logoEndpointsFor } from "@/lib/logo-endpoints"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { PaymentMethodModal } from "@/components/payment-method-modal"
import EmployerDataTab from "@/components/employer-tabs/employer-data-tab"
import PartnerDataTab from "@/components/partner-tabs/partner-data-tab"
import { ClientDataTab } from "@/components/client-tabs/client-data-tab"
import { WorkerDataTab } from "@/components/worker-tab/worker-data-tab"
import { AdminProfileTab } from "@/components/admin-profile-tab"
import { AliasField } from "@/components/alias-field"

// Static lookup matching the backend `cjobs_payment_methods` seed (id 1..5).
// Used to label the current method on the /mydata Payment-method card.
const PAYMENT_METHOD_KEYS: Record<number, string> = {
  1: "TRANSFER",
  2: "DIRECT_DEBIT",
  3: "CARD",
  4: "PAYPAL",
  5: "OTHERS",
}

type ImageKind = "profile" | "logo"

interface ImageUploadCardProps {
  kind: ImageKind
  title: string
  description: string
  currentLabel: string
  currentHint: string
  imageUrl: string | null
  isUploading: boolean
  isDragging: boolean
  onPick: () => void
  onDelete: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

function ImageUploadCard({
  kind,
  title,
  description,
  currentLabel,
  currentHint,
  imageUrl,
  isUploading,
  isDragging,
  onPick,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  fileInputRef,
}: ImageUploadCardProps) {
  const { t } = useTranslation()
  const Icon = kind === "profile" ? UserCircle2 : ImageIcon

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/20 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-[#6B21A8] flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={onFileChange}
        />

        {imageUrl ? (
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative h-32 w-32 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
              {isUploading ? (
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={title} className="w-full h-full object-contain p-2" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{currentLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">{currentHint}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  type="button"
                  onClick={onPick}
                  disabled={isUploading}
                  className="bg-[#6B21A8] hover:bg-[#5b1d91] text-white h-9 text-xs gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t("change") || "Change"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDelete}
                  disabled={isUploading}
                  className="h-9 text-xs gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("remove") || "Remove"}
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
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isUploading
                  ? (t("uploading") || "Uploading...")
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
  )
}

interface UseImageUploadOpts {
  endpoint: string | undefined
  accessToken: string | undefined
  // Custom event dispatched on every successful upload/delete so other surfaces
  // (e.g. the nav avatar dropdown) reflect the change without a page reload.
  changedEvent: string
  // The field on the upload/read response payload that holds the URL.
  urlField: "profilePhotoUrl" | "logoUrl"
}

function useImageUpload({ endpoint, accessToken, changedEvent, urlField }: UseImageUploadOpts) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const validateAndUpload = async (file: File) => {
    if (!accessToken || !endpoint) return
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({ title: t("logoMustBePngOrJpeg") || "Image must be PNG or JPEG", variant: "destructive" })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("logoTooLarge") || "Image must be 2 MB or smaller", variant: "destructive" })
      return
    }

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const result = await res.json()
      const newUrl = result?.data?.[urlField] ?? null
      setImageUrl(newUrl)
      window.dispatchEvent(new CustomEvent(changedEvent, { detail: { url: newUrl } }))
      toast({ title: t("updated") || "Updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const onPick = () => fileInputRef.current?.click()

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!accessToken || !imageUrl || !endpoint) return
    setIsUploading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      setImageUrl(null)
      window.dispatchEvent(new CustomEvent(changedEvent, { detail: { url: null } }))
      toast({ title: t("removed") || "Removed", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  return {
    imageUrl,
    setImageUrl,
    isUploading,
    isDragging,
    fileInputRef,
    onPick,
    onFileChange,
    onDragOver,
    onDragLeave,
    onDrop,
    onDelete,
  }
}

export default function MyDataPage() {
  const { t, tEnum } = useTranslation()
  const { session, getUserRole } = useAuth()
  const role = getUserRole()

  const endpoints = useMemo(() => logoEndpointsFor(role), [role])
  const isEmployer = role === "employer"
  const isPersonal = role === "worker" || role === "admin"

  const [isLoading, setIsLoading] = useState(true)

  // Employer-only payment-method panel. Loaded once when the role is
  // employer; the modal flips both billingStatus locally on save.
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [billingStatus, setBillingStatus] = useState<string | null>(null)
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)

  // The "logo" upload represents the brand image (printed on QR-code PDFs)
  // for employers, and the catch-all profile avatar for every other role.
  const logoUpload = useImageUpload({
    endpoint: endpoints?.logo,
    accessToken: session?.accessToken,
    changedEvent: isEmployer ? "employer-logo-changed" : "user-identity-changed",
    urlField: "logoUrl",
  })

  // Employer-only second image: identity photo (nav avatar, etc.).
  const profileUpload = useImageUpload({
    endpoint: endpoints?.profile,
    accessToken: session?.accessToken,
    changedEvent: "user-identity-changed",
    urlField: "profilePhotoUrl",
  })

  useEffect(() => {
    if (!isEmployer || !session?.accessToken) return
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
  }, [isEmployer, session?.accessToken])

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
          logoUpload.setImageUrl(result?.data?.logoUrl ?? null)
          if (endpoints.profile) {
            profileUpload.setImageUrl(result?.data?.profilePhotoUrl ?? null)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
    // We intentionally re-run only when the read endpoint / token changes;
    // the setter refs from useImageUpload are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, endpoints?.read])

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

  // Labels:
  //  - Employer: TWO cards. Profile photo (identity) + Company logo (print).
  //  - Org roles without a profile slot (partner, client): single card,
  //    labelled "Company logo" since that image both prints AND avatars.
  //  - Personal roles (worker, admin): single card, "Profile picture".
  const logoTitle = isEmployer
    ? (t("companyLogo") || "Company logo")
    : isPersonal
      ? (t("profilePicture") || "Profile picture")
      : (t("companyLogo") || "Company logo")
  const logoDesc = isEmployer
    ? (t("companyLogoDescription") ||
        "This logo will appear on the bottom-left of every QR-code PDF you print for your work centers.")
    : isPersonal
      ? (t("profilePictureDescription") || "Used as your avatar across the app.")
      : (t("companyLogoDescription") ||
          "This logo will appear on the bottom-left of every QR-code PDF you print for your work centers.")
  const logoCurrentLabel = isEmployer
    ? (t("logoCurrentlyActive") || "Logo currently active")
    : (t("imageCurrentlyActive") || "Image currently active")
  const logoCurrentHint = isEmployer
    ? (t("logoCurrentlyActiveHint") ||
        "It will print on every QR PDF you generate. Replace it any time.")
    : (t("imageCurrentlyActiveHint") || "Replace it any time.")

  const currentPaymentMethodLabel =
    paymentMethodId && PAYMENT_METHOD_KEYS[paymentMethodId]
      ? tEnum("paymentMethod", PAYMENT_METHOD_KEYS[paymentMethodId]) ||
        PAYMENT_METHOD_KEYS[paymentMethodId]
      : null

  return (
    <div className="w-full p-2 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{t("mydata") || "My Data"}</h1>
        <p className="text-sm text-muted-foreground">
          {t("mydataIntro") ||
            "Manage your profile and the branding that appears on documents you generate."}
        </p>
      </div>

      <AliasField />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-base font-semibold">{t("data") || "Data"}</h2>
        </div>
        <div className="p-2">
          {role === "employer" && <EmployerDataTab employerId="" selfService />}
          {role === "partner" && <PartnerDataTab partnerId="" selfService />}
          {role === "client" && <ClientDataTab clientId="" selfService />}
          {role === "worker" && <WorkerDataTab selfService />}
          {role === "admin" && <AdminProfileTab />}
        </div>
      </div>

      {isEmployer && (
        <ImageUploadCard
          kind="logo"
          title={logoTitle}
          description={logoDesc}
          currentLabel={logoCurrentLabel}
          currentHint={logoCurrentHint}
          imageUrl={logoUpload.imageUrl}
          isUploading={logoUpload.isUploading}
          isDragging={logoUpload.isDragging}
          onPick={logoUpload.onPick}
          onDelete={logoUpload.onDelete}
          onDragOver={logoUpload.onDragOver}
          onDragLeave={logoUpload.onDragLeave}
          onDrop={logoUpload.onDrop}
          onFileChange={logoUpload.onFileChange}
          fileInputRef={logoUpload.fileInputRef}
        />
      )}

      {/* Payment method — employer role only. Reachable from here for
          changing it any time, and from the dashboard banner when the
          employer is sitting in AWAITING_PAYMENT_METHOD after trial-end. */}
      {isEmployer && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
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
