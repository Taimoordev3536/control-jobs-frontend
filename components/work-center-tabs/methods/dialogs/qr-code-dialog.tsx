"use client"

import { useState, useEffect } from "react"
import { Printer, Mail, RefreshCw, QrCode } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { Input } from "@/components/ui/input"

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

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: number
  qrData?: { active: boolean; code: string }
  onUpdate: () => void
}

export function QrCodeDialog({ open, onOpenChange, workCenterId, qrData, onUpdate }: QrCodeDialogProps) {
  const { session } = useAuth()
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

  const selectedQr = qrType === "STATIC" ? staticQr : dynamicQr
  // Check both isSelected and isActive for backward compatibility with old data
  const isActive = selectedQr?.isSelected || selectedQr?.isActive || false

  // Fetch QR codes when dialog opens
  useEffect(() => {
    if (!open || !session?.accessToken) return
    fetchQrCodes()
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
        alert("Error al activar el código QR")
      }
    } catch (error) {
      console.error("Error activating QR:", error)
      alert("Error al activar el código QR")
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
        alert("Error al desactivar el código QR")
      }
    } catch (error) {
      console.error("Error deactivating QR:", error)
      alert("Error al desactivar el código QR")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    if (!selectedQr?.qrImage) return
    const printWindow = window.open("", "_blank", "noopener,noreferrer")
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Código QR - ${qrType}</title>
          <style>
            html, body { height: 100%; margin: 0; }
            body { display: grid; place-items: center; font-family: sans-serif; }
            .container { text-align: center; }
            img { width: 320px; height: 320px; margin: 20px; }
            h2 { color: #6B21A8; margin: 10px; }
            p { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Código QR ${qrType === 'STATIC' ? 'Estático' : 'Dinámico'}</h2>
            <img src="${selectedQr.qrImage}" alt="QR Code" />
            <p>Centro de Trabajo #${workCenterId}</p>
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 250);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
        alert("Email enviado correctamente")
        setShowEmailInput(false)
        setClientEmail("")
      } else {
        const error = await response.json()
        alert(error.message || "Error al enviar el email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      alert("Error al enviar el email")
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
        alert("Código QR estático regenerado correctamente")
        await fetchQrCodes()
      } else {
        const error = await response.json()
        alert(error.message || "Error al regenerar el código QR")
      }
    } catch (error) {
      console.error("Error regenerating QR:", error)
      alert("Error al regenerar el código QR")
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
          <DialogTitle className="text-center">Código QR - Centro de Trabajo</DialogTitle>
          <DialogDescription className="sr-only">
            Configuración del código QR estático o dinámico para el centro de trabajo
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-[#6B21A8]" />
          </div>
        ) : (
          <div className="space-y-6">
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
                  Estático
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
                  Dinámico
                </button>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="flex flex-col items-center gap-3">
              {selectedQr?.qrImage ? (
                <>
                  <img src={selectedQr.qrImage} alt="QR Code" className="w-56 h-56 border-2 border-gray-200 rounded-lg" />
                  {qrType === "DYNAMIC" && timeUntilExpiry && (
                    <div className="text-sm text-gray-600 font-medium">
                      Expira en: <span className="text-[#6B21A8]">{timeUntilExpiry}</span>
                    </div>
                  )}
                  {qrType === "STATIC" && selectedQr.isSelected && (
                    <div className="text-xs text-gray-500">
                      QR permanente - válido indefinidamente
                    </div>
                  )}
                </>
              ) : (
                <div className="w-56 h-56 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay código QR {qrType === "STATIC" ? "estático" : "dinámico"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Label className="text-base font-medium">Estado:</Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    isActive ? handleDeactivateQr() : handleActivateQrType(qrType)
                  }}
                  disabled={isSaving}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 disabled:opacity-50 ${
                    isActive ? "bg-[#6B21A8]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                      isActive ? "translate-x-9" : "translate-x-1"
                    }`}
                  />
                  <span
                    className={`absolute text-xs font-medium transition-opacity ${
                      isActive ? "left-2 text-white opacity-100" : "left-2 opacity-0"
                    }`}
                  >
                    Sí
                  </span>
                  <span
                    className={`absolute text-xs font-medium transition-opacity ${
                      !isActive ? "right-2 text-gray-600 opacity-100" : "right-2 opacity-0"
                    }`}
                  >
                    No
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedQr?.isSelected && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handlePrint} 
                      aria-label="Imprimir"
                      title="Imprimir QR"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {qrType === "STATIC" && (
                      <>
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
                    {qrType === "DYNAMIC" && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={fetchQrCodes}
                        aria-label="Refrescar"
                        title="Refrescar QR dinámico"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Email Input */}
            {showEmailInput && qrType === "STATIC" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">Enviar QR estático por email:</Label>
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
                    {isSendingEmail ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  El cliente recibirá el código QR estático por email para imprimirlo
                </p>
              </div>
            )}

            {/* Info Message */}
            {!selectedQr && (
              <div className="text-sm text-gray-500 text-center p-4 bg-gray-50 rounded-lg">
                {qrType === "STATIC" 
                  ? "Activa el QR estático para generar un código permanente"
                  : "Activa el QR dinámico para generar un código que se actualiza cada 30 segundos"}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
