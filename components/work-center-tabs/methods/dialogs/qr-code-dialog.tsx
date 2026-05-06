"use client"

import { useState, useEffect } from "react"
import { Mail, RefreshCw, QrCode } from "lucide-react"
import PdfIcon1 from "../../../../icons/Controles/pdf1.svg"
import PdfIcon2 from "../../../../icons/Controles/pdf2.svg"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { Input } from "@/components/ui/input"
import { AnimatedLoader } from "@/components/animated-loader"

interface QrCodeData {
  id: string
  type: 'STATIC' | 'DYNAMIC'
  token: string
  qrImage: string
  isActive: boolean
  isSelected: boolean
  expiresAt?: string
  lastRefreshedAt?: string
}

interface WorkCenterData {
  id: number
  name: string
  locality?: string
  address?: string
  province?: string
  clientName?: string
  employer?: {
    name: string
    address?: string
    postalCode?: string
    city?: string
    province?: string
    logoUrl?: string
  }
}

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string
  qrData?: { active: boolean; code: string }
  onUpdate: () => void
}

function sanitizeFileSegment(s: string): string {
  // File systems don't like slashes, colons, or control chars in filenames —
  // strip them and collapse whitespace so the default download name is safe
  // on Windows/macOS/Linux alike.
  return (s || "")
    .replace(/[\\/:*?"<>|\r\n\t]/g, "")
    .replace(/\s+/g, "_")
    .trim()
}



export function QrCodeDialog({ open, onOpenChange, workCenterId, qrData, onUpdate }: QrCodeDialogProps) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const translateBackendError = useBackendError()
  const [qrType, setQrType] = useState<"STATIC" | "DYNAMIC">("STATIC")
  const [staticQr, setStaticQr] = useState<QrCodeData | null>(null)
  const [dynamicQr, setDynamicQr] = useState<QrCodeData | null>(null)
  const [clientEmail, setClientEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [pdfHovered, setPdfHovered] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")
  const [workCenterData, setWorkCenterData] = useState<WorkCenterData | null>(null)
  const [isLoadingWorkCenter, setIsLoadingWorkCenter] = useState(false)
  const [progressPercent, setProgressPercent] = useState(100)

  const selectedQr = qrType === "STATIC" ? staticQr : dynamicQr
  // Check both isSelected and isActive for backward compatibility with old data
  const isActive = selectedQr?.isSelected || selectedQr?.isActive || false

  // Ask the backend to render the QR print layout to a PDF via headless
  // Chromium and trigger a download. Previously this opened a popup and
  // called window.print(), which produced inconsistent output depending on
  // the user's printer driver, scaling choice, and paper size — the
  // server-rendered PDF is always A5 portrait, byte-for-byte identical
  // across machines, and the user can print it for far better fidelity.
  const printQr = async () => {
    if (!selectedQr?.qrImage) {
      toast({ title: t("noQrToPrint"), variant: "destructive" })
      return
    }
    if (!session?.accessToken) return

    setIsDownloadingPdf(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/qr-pdf`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      )
      if (!response.ok) {
        toast({ title: t("qrPdfError") || "Error al generar el PDF", variant: "destructive" })
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `QR_${sanitizeFileSegment(workCenterData?.name || "work-center")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading QR PDF:", error)
      toast({ title: t("qrPdfError") || "Error al generar el PDF", variant: "destructive" })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Fetch QR codes when dialog opens
  useEffect(() => {
    if (!open || !session?.accessToken) return
    fetchQrCodes()
    fetchWorkCenterDetails()
  }, [open, session?.accessToken, workCenterId])

  // Update expiry countdown and progress bar for dynamic QR.
  //
  // Visual countdown is anchored to the client's receipt of this QR, not the
  // server-side `expiresAt - 30s`. Network latency previously made the
  // server-anchored start time slightly in the past on arrival, so the bar
  // started at 95-98% instead of 100% (user-reported "starts below 30 seconds").
  // The actual server expiry is still respected by the scan flow on the
  // backend; this effect only drives the visual.
  useEffect(() => {
    if (!dynamicQr?.expiresAt || !dynamicQr?.isSelected) {
      setTimeUntilExpiry("")
      setProgressPercent(100)
      return
    }

    const totalDuration = 30000 // 30 seconds
    const visualStart = Date.now()
    const visualEnd = visualStart + totalDuration

    // Refetch exactly once per cycle, after a short hold at 0% so the bar is
    // visibly empty before the next QR loads (otherwise React batches the
    // setState(0) with the new dynamicQr and the bar appears to skip zero).
    let didRefetch = false
    let refetchTimer: ReturnType<typeof setTimeout> | null = null

    const update = () => {
      const now = Date.now()
      const diff = visualEnd - now

      if (diff <= 0) {
        setTimeUntilExpiry("Expirado - Actualizando...")
        setProgressPercent(0)
        if (!didRefetch) {
          didRefetch = true
          refetchTimer = setTimeout(() => fetchQrCodes(), 350)
        }
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeUntilExpiry(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      setProgressPercent((diff / totalDuration) * 100)
    }

    update()
    const interval = setInterval(update, 200)
    return () => {
      clearInterval(interval)
      if (refetchTimer) clearTimeout(refetchTimer)
    }
  }, [dynamicQr?.expiresAt, dynamicQr?.isSelected])

  const fetchQrCodes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/qr-codes`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        const data = result.data // Backend wraps response in { data: { staticQr, dynamicQr } }
        setStaticQr(data.staticQr || null)
        setDynamicQr(data.dynamicQr || null)
        
        // Set selected type based on what's currently selected
        if (data.staticQr?.isSelected) {
          setQrType("STATIC")
        } else if (data.dynamicQr?.isSelected) {
          setQrType("DYNAMIC")
        }
      }
    } catch (error) {
      console.error("Error fetching QR codes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWorkCenterDetails = async () => {
    setIsLoadingWorkCenter(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        if (result.isSuccess && result.data) {
          const data = result.data
          const emp = data.employer
          setWorkCenterData({
            id: data.id,
            name: data.name,
            locality: data.locality || data.city || "",
            address: data.address || "",
            province: data.province || "",
            clientName: data.client?.name || "",
            employer: emp ? {
              name: emp.name,
              address: emp.address,
              postalCode: emp.postalCode || emp.postal_code,
              city: emp.city,
              province: emp.province,
              logoUrl: emp.logoUrl || emp.logo_url || emp.logo || undefined,
            } : undefined
          })
        }
      }
    } catch (error) {
      console.error("Error fetching work center details:", error)
    } finally {
      setIsLoadingWorkCenter(false)
    }
  }

  const handleActivateQrType = async (type: "STATIC" | "DYNAMIC") => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/signing-methods/qr`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedType: type,
            active: true,
          }),
        }
      )

      if (response.ok) {
        await fetchQrCodes()
        // Don't call onUpdate() here to keep dialog open
      } else {
        toast({ title: t("qrActivateError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error activating QR:", error)
      toast({ title: t("qrActivateError"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivateQr = async () => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/signing-methods/qr`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedType: qrType,
            active: false,
          }),
        }
      )

      if (response.ok) {
        await fetchQrCodes()
        // Don't call onUpdate() here to keep dialog open
      } else {
        toast({ title: t("qrDeactivateError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deactivating QR:", error)
      toast({ title: t("qrDeactivateError"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendEmail = async () => {
    if (!clientEmail || !session?.accessToken) return

    setIsSendingEmail(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/send-static-qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientEmail: clientEmail,
          }),
        }
      )

      if (response.ok) {
        toast({ title: t("emailSentSuccess"), variant: "success" })
        setShowEmailInput(false)
        setClientEmail("")
      } else {
        const error = await response.json()
        toast({ title: translateBackendError(error, "emailSendError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast({ title: t("emailSendError"), variant: "destructive" })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleRegenerateStaticQr = async () => {
    if (!session?.accessToken) return

    const confirmed = window.confirm(
      "¿Estás seguro de regenerar el código QR estático?\n\nEl código anterior quedará inválido y no podrá usarse para fichajes."
    )

    if (!confirmed) return

    setIsRegenerating(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/regenerate-static-qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        toast({ title: t("qrRegenerateSuccess"), variant: "success" })
        await fetchQrCodes()
      } else {
        const error = await response.json()
        toast({ title: translateBackendError(error, "qrRegenerateError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error regenerating QR:", error)
      toast({ title: t("qrRegenerateError"), variant: "destructive" })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleTypeChange = (e: React.MouseEvent, newType: "STATIC" | "DYNAMIC") => {
    e.preventDefault()
    e.stopPropagation()
    setQrType(newType)
    // Don't auto-activate - employer must manually toggle Estado switch
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Call onUpdate when dialog closes to refresh parent table
        onUpdate()
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isLoadingWorkCenter && !workCenterData ? (
              <>
                <div className="h-5 w-40 mx-auto bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 mx-auto bg-gray-100 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <div className="text-base font-bold uppercase tracking-wide">{workCenterData?.name || ""}</div>
                {(() => {
                  // Prefer the dedicated locality column. If the work center was created without
                  // a Google-suggested address, locality may be empty — in that case derive a city
                  // candidate from the address string ("Calle X 25, Pamplona, Spain" → "Pamplona"),
                  // and as a last resort show the address itself so users always see *something*
                  // identifying the work center under its name.
                  const locality = (workCenterData?.locality || "").trim()
                  if (locality) return (
                    <div className="text-sm font-normal text-muted-foreground">{locality}</div>
                  )
                  const address = (workCenterData?.address || "").trim()
                  if (address) {
                    const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
                    // Take the second segment if present (typical "street, city, country")
                    const candidate = parts.length >= 2 ? parts[1] : parts[0]
                    if (candidate) return (
                      <div className="text-sm font-normal text-muted-foreground">{candidate}</div>
                    )
                  }
                  return null
                })()}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configuración del código QR estático o dinámico para el centro de trabajo
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <AnimatedLoader size={32} className="py-8" />
        ) : (
          <div className="space-y-4">
            {/* QR Type Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={(e) => handleTypeChange(e, "STATIC")}
                  disabled={isSaving}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    qrType === "STATIC"
                      ? "bg-[#6B21A8] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  {t("qrStatic")}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleTypeChange(e, "DYNAMIC")}
                  disabled={isSaving}
                  className={`px-6 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    qrType === "DYNAMIC"
                      ? "bg-[#6B21A8] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  {t("qrDynamic")}
                </button>
              </div>
            </div>

            {/* QR Code Display - fixed height to prevent layout shift between tabs */}
            <div className="flex flex-col items-center gap-2">
              {selectedQr?.qrImage ? (
                <img src={selectedQr.qrImage} alt="QR Code" className="w-48 h-48 border-2 border-gray-200 rounded-lg" />
              ) : (
                <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {qrType === "DYNAMIC"
                        ? t("dynamicQrInactive")
                        : t("staticQrInactive")}
                    </p>
                  </div>
                </div>
              )}
              {/* Always render progress bar row to keep consistent height */}
              <div className="h-4">
                {qrType === "DYNAMIC" && isActive && selectedQr?.qrImage && timeUntilExpiry && (
                  <div className="flex items-center w-48">
                    <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-colors ${
                        Math.ceil((progressPercent / 100) * 30) <= 10 ? 'bg-[#C2185B]' : 'bg-[#6B21A8]'
                      }`}
                        style={{
                          width: `${progressPercent}%`,
                          transition: 'width 200ms linear',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{t("activate")}</Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    isActive ? handleDeactivateQr() : handleActivateQrType(qrType)
                  }}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 disabled:opacity-50 ${
                    isActive ? "bg-[#6B21A8]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      isActive ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                  <span
                    className={`absolute text-[10px] font-medium transition-opacity ${
                      isActive ? "left-1.5 text-white opacity-100" : "left-1.5 opacity-0"
                    }`}
                  >
                    {t("yes")}
                  </span>
                  <span
                    className={`absolute text-[10px] font-medium transition-opacity ${
                      !isActive ? "right-1.5 text-gray-600 opacity-100" : "right-1.5 opacity-0"
                    }`}
                  >
                    {t("no")}
                  </span>
                </button>
              </div>

              {/* Action Buttons - mirror the borderless toolbar icon style
                  used in DataListTemplate's ActionIconButton: plain <button>,
                  purple text, soft purple hover bg, hover swaps PDF1 → PDF2. */}
              <div className="flex items-center gap-1 min-h-[36px]">
                {selectedQr?.isSelected && qrType === "STATIC" && (
                  <>
                    <button
                      type="button"
                      onClick={printQr}
                      onMouseEnter={() => setPdfHovered(true)}
                      onMouseLeave={() => setPdfHovered(false)}
                      disabled={isDownloadingPdf}
                      aria-label="Descargar PDF"
                      title="Descargar QR en PDF"
                      className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors disabled:opacity-60"
                    >
                      {isDownloadingPdf ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : pdfHovered ? (
                        <PdfIcon2 className="w-5 h-5" />
                      ) : (
                        <PdfIcon1 className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailInput(!showEmailInput)}
                      aria-label="Enviar por email"
                      title="Enviar QR por email"
                      className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateStaticQr}
                      disabled={isRegenerating}
                      aria-label="Regenerar"
                      title="Regenerar QR (el anterior quedará inválido)"
                      className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-md transition-colors disabled:opacity-60"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Email Input */}
            {showEmailInput && qrType === "STATIC" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">{t("sendStaticQrByEmail")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@cliente.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendEmail}
                    disabled={!clientEmail || isSendingEmail}
                    className="bg-[#6B21A8] hover:bg-[#581C87] text-white"
                  >
                    {isSendingEmail ? t("sending") : t("send")}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {t("sendStaticQrHint")}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
