"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import QRCode from "qrcode"

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: number
  qrData?: { active: boolean; code: string }
  onUpdate: () => void
}

export function QrCodeDialog({ open, onOpenChange, workCenterId, qrData, onUpdate }: QrCodeDialogProps) {
  const { session } = useAuth()
  const [qrType, setQrType] = useState<"static" | "dynamic">("static")
  const [qrCode, setQrCode] = useState(qrData?.code || "controljobs")
  const [active, setActive] = useState(qrData?.active || false)
  const [qrImageUrl, setQrImageUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (qrCode) {
      generateQRCode(qrCode)
    }
  }, [qrCode])

  const generateQRCode = async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
      })
      setQrImageUrl(url)
    } catch (error) {
      console.error("Error generating QR code:", error)
    }
  }

  const handleRegenerate = () => {
    const newCode = `controljobs_${Date.now()}`
    setQrCode(newCode)
  }

  const handleSave = async () => {
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
            active,
            code: qrCode,
          }),
        }
      )

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      } else {
        alert("Error al guardar el código QR")
      }
    } catch (error) {
      console.error("Error saving QR code:", error)
      alert("Error al guardar el código QR")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Código QR</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Type Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setQrType("static")}
                className={`px-6 py-2 text-sm font-medium transition-colors ${
                  qrType === "static"
                    ? "bg-[#6B21A8] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Estático
              </button>
              <button
                type="button"
                onClick={() => setQrType("dynamic")}
                className={`px-6 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  qrType === "dynamic"
                    ? "bg-[#6B21A8] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Dinámico
              </button>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center">
            {qrImageUrl && (
              <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
            )}
          </div>

          {/* QR Code Text + Regenerate (only for static) */}
          {qrType === "static" && (
            <div className="flex gap-2">
              <Input
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleRegenerate}>
                Regenerar
              </Button>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-base font-medium">Activar:</Label>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 ${
                active ? "bg-[#6B21A8]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  active ? "translate-x-9" : "translate-x-1"
                }`}
              />
              <span className={`absolute text-xs font-medium transition-opacity ${
                active ? "left-2 text-white opacity-100" : "left-2 opacity-0"
              }`}>
                Sí
              </span>
              <span className={`absolute text-xs font-medium transition-opacity ${
                !active ? "right-2 text-gray-600 opacity-100" : "right-2 opacity-0"
              }`}>
                No
              </span>
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#6B21A8] hover:bg-[#581C87] text-white"
            >
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
