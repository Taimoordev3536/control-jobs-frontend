"use client"

import { useState, useEffect, useRef, forwardRef } from "react"
import { Printer, Mail, RefreshCw, QrCode } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { AnimatedLoader } from "@/components/animated-loader"
import ControlJobsLogo from "@/icons/Logos/ControlJobs.svg"
import { useReactToPrint } from "react-to-print"

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
  clientName?: string
  employer?: {
    name: string
    address?: string
    postalCode?: string
    city?: string
    province?: string
  }
}

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string
  qrData?: { active: boolean; code: string }
  onUpdate: () => void
}

// Auto-size dual lines: both lines share the SAME font size (determined by the longer text)
function AutoSizeDualLine({ line1, line2, maxFontSize, minFontSize = 8, style }: {
  line1: string; line2?: string; maxFontSize: number; minFontSize?: number; style?: React.CSSProperties
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const text1Ref = useRef<HTMLSpanElement>(null)
  const text2Ref = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(maxFontSize)

  useEffect(() => {
    if (!containerRef.current || !text1Ref.current) return
    const containerWidth = containerRef.current.clientWidth
    if (containerWidth === 0) return
    let size = maxFontSize
    const applySize = (s: number) => {
      text1Ref.current!.style.fontSize = `${s}px`
      if (text2Ref.current) text2Ref.current.style.fontSize = `${s}px`
    }
    applySize(size)
    while (size > minFontSize) {
      const over1 = text1Ref.current.scrollWidth > containerWidth
      const over2 = text2Ref.current ? text2Ref.current.scrollWidth > containerWidth : false
      if (!over1 && !over2) break
      size -= 1
      applySize(size)
    }
    setFontSize(size)
  }, [line1, line2, maxFontSize, minFontSize])

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden', textAlign: 'center' }}>
      <span ref={text1Ref} style={{ fontSize: `${fontSize}px`, whiteSpace: 'nowrap', display: 'block', ...style }}>
        {line1}
      </span>
      {line2 && (
        <span ref={text2Ref} style={{ fontSize: `${fontSize}px`, whiteSpace: 'nowrap', display: 'block', marginTop: '1mm', ...style }}>
          {line2}
        </span>
      )}
    </div>
  )
}

// Auto-sizing single line text
function AutoSizeText({ text, maxFontSize, minFontSize = 8, style }: { text: string; maxFontSize: number; minFontSize?: number; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(maxFontSize)

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return
    const containerWidth = containerRef.current.clientWidth
    if (containerWidth === 0) return
    let size = maxFontSize
    textRef.current.style.fontSize = `${size}px`
    while (textRef.current.scrollWidth > containerWidth && size > minFontSize) {
      size -= 1
      textRef.current.style.fontSize = `${size}px`
    }
    setFontSize(size)
  }, [text, maxFontSize, minFontSize])

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
      <span ref={textRef} style={{ fontSize: `${fontSize}px`, whiteSpace: 'nowrap', display: 'block', ...style }}>
        {text}
      </span>
    </div>
  )
}

// Printable QR Component
interface PrintableQrProps {
  qrImage: string
  workCenterName: string
  workCenterCity: string
  clientName: string
  employer?: {
    name: string
    address?: string
    postalCode?: string
    city?: string
    province?: string
  }
}

const PrintableQr = forwardRef<HTMLDivElement, PrintableQrProps>(({ qrImage, workCenterName, workCenterCity, clientName, employer }, ref) => (
  <div ref={ref} id="printable-qr-root" style={{ 
    width: '100%',
    height: '100%',
    margin: 0, 
    padding: 0,
    backgroundColor: '#a6a6a6',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
  }}>
    {/* Gray frame with generous padding acting as the visible border */}
    <div style={{
      width: '100%',
      height: '100%',
      padding: '3%',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '3%',
      boxSizing: 'border-box' as const,
    }}>
      {/* Work Center Name + City block */}
      <div style={{ flex: '0 0 10%', backgroundColor: 'white', padding: '2% 3%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' as const }}>
        <AutoSizeDualLine
          line1={workCenterName.toUpperCase()}
          line2={workCenterCity ? workCenterCity.toUpperCase() : undefined}
          maxFontSize={36}
          style={{ fontWeight: 'bold', letterSpacing: '0.05em', color: 'black', textAlign: 'center' }}
        />
      </div>

      {/* QR Code block — large, minimal inner padding so QR fills the box */}
      <div style={{ flex: '1 1 auto', backgroundColor: 'white', padding: '1%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box' as const }}>
        {qrImage ? (
          <img src={qrImage} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
        ) : (
          <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', border: '2px dashed #d1d5db' }}>
            <span style={{ color: '#6b7280' }}>QR Code</span>
          </div>
        )}
      </div>

      {/* Client Name block */}
      <div style={{ flex: '0 0 6%', backgroundColor: 'white', padding: '1% 3%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' as const }}>
        <AutoSizeText
          text={clientName.toUpperCase()}
          maxFontSize={26}
          style={{ fontWeight: 'bold', letterSpacing: '0.05em', color: 'black', textAlign: 'center' }}
        />
      </div>

      {/* Bottom area: Employer info (left) + ControlJobs (right) */}
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 0.5%' }}>
        {/* Employer info — white italic text on gray */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
          {employer?.name && (
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1.4 }}>{employer.name}</span>
          )}
          {employer?.address && (
            <span style={{ color: 'white', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.4 }}>{employer.address}</span>
          )}
          {(employer?.postalCode || employer?.city) && (
            <span style={{ color: 'white', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.4 }}>
              {[employer.postalCode, employer.city].filter(Boolean).join(' ')}
            </span>
          )}
          {employer?.province && (
            <span style={{ color: 'white', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.4 }}>{employer.province}</span>
          )}
        </div>

        {/* ControlJobs branding — bottom right */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '1mm' }}>
          <span style={{ color: '#374151', fontSize: '10px', fontWeight: '500' }}>Powered by</span>
          <ControlJobsLogo style={{ height: '36px', width: '150px', opacity: 0.9 }} />
        </div>
      </div>
    </div>
  </div>
))
PrintableQr.displayName = 'PrintableQr'

export function QrCodeDialog({ open, onOpenChange, workCenterId, qrData, onUpdate }: QrCodeDialogProps) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const [qrType, setQrType] = useState<"STATIC" | "DYNAMIC">("STATIC")
  const [staticQr, setStaticQr] = useState<QrCodeData | null>(null)
  const [dynamicQr, setDynamicQr] = useState<QrCodeData | null>(null)
  const [clientEmail, setClientEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")
  const [workCenterData, setWorkCenterData] = useState<WorkCenterData | null>(null) 
  const printRef = useRef<HTMLDivElement>(null)

  const selectedQr = qrType === "STATIC" ? staticQr : dynamicQr
  // Check both isSelected and isActive for backward compatibility with old data
  const isActive = selectedQr?.isSelected || selectedQr?.isActive || false

const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: '',
  pageStyle: `
    @page { margin: 0 !important; padding: 0 !important; }
    html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
    #printable-qr-root { width: 100vw !important; height: 100vh !important; overflow: hidden !important; }
  `,
})


  const printQr = () => {
    if (!selectedQr?.qrImage) {
      toast({ title: t("noQrToPrint"), variant: "destructive" })
      return
    }
    handlePrint()
  }

  // Fetch QR codes when dialog opens
  useEffect(() => {
    if (!open || !session?.accessToken) return
    fetchQrCodes()
    fetchWorkCenterDetails()
  }, [open, session?.accessToken, workCenterId])

  // Update expiry countdown for dynamic QR
  useEffect(() => {
    if (!dynamicQr?.expiresAt || !dynamicQr?.isSelected) {
      setTimeUntilExpiry("")
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const expiry = new Date(dynamicQr.expiresAt!)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilExpiry("Expirado - Actualizando...")
        fetchQrCodes() // Refresh to get new token
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeUntilExpiry(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
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
            clientName: data.client?.name || "",
            employer: emp ? {
              name: emp.name,
              address: emp.address,
              postalCode: emp.postalCode || emp.postal_code,
              city: emp.city,
              province: emp.province,
            } : undefined
          })
        }
      }
    } catch (error) {
      console.error("Error fetching work center details:", error)
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
        toast({ title: t("emailSentSuccess") })
        setShowEmailInput(false)
        setClientEmail("")
      } else {
        const error = await response.json()
        toast({ title: error.message || t("emailSendError"), variant: "destructive" })
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
        toast({ title: t("qrRegenerateSuccess") })
        await fetchQrCodes()
      } else {
        const error = await response.json()
        toast({ title: error.message || t("qrRegenerateError"), variant: "destructive" })
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
            <div className="text-base font-bold uppercase tracking-wide">{workCenterData?.name || t("workCenter")}</div>
            {workCenterData?.locality && (
              <div className="text-sm font-normal text-muted-foreground">{workCenterData.locality}</div>
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
              <div className="w-48 h-2">
                {qrType === "DYNAMIC" && isActive && selectedQr?.qrImage && timeUntilExpiry && (
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#6B21A8] transition-all duration-1000 ease-linear"
                      style={{
                        width: (() => {
                          if (!dynamicQr?.expiresAt) return '0%'
                          const now = new Date().getTime()
                          const expiry = new Date(dynamicQr.expiresAt).getTime()
                          const remaining = Math.max(0, expiry - now)
                          return `${Math.min(100, (remaining / 30000) * 100)}%`
                        })(),
                      }}
                    />
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

              {/* Action Buttons - always reserve space for consistent layout */}
              <div className="flex items-center gap-2 min-h-[36px]">
                {selectedQr?.isSelected && qrType === "STATIC" && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={printQr} 
                      aria-label="Imprimir"
                      title="Imprimir QR"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setShowEmailInput(!showEmailInput)}
                      aria-label="Enviar por email"
                      title="Enviar QR por email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleRegenerateStaticQr}
                      disabled={isRegenerating}
                      aria-label="Regenerar"
                      title="Regenerar QR (el anterior quedará inválido)"
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                    </Button>
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
      
      {/* Hidden printable component — offscreen (not display:none) so refs can measure */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '148mm', height: '210mm' }}>
        <PrintableQr 
          ref={printRef}
          qrImage={selectedQr?.qrImage || ''}
          workCenterName={workCenterData?.name || "WORKCENTER 1"}
          workCenterCity={workCenterData?.locality || ""}
          clientName={workCenterData?.clientName || "CLIENTE"}
          employer={workCenterData?.employer}
        />
      </div>
    </Dialog>
  )
}
