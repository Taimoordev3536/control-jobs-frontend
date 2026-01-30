"use client"

import { useState, useEffect } from "react"
import { QrCode, X, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface WorkCenter {
  id: number
  name: string
  qrType: 'static' | 'dynamic'
  address: string
}

interface MergedQrData {
  qrImage: string
  mergedToken: string
  workCenters: WorkCenter[]
  expiresAt: string | null
  refreshInterval: number
  generatedAt: string
}

interface ClientMergedQrDisplayProps {
  jobId: number
}

export function ClientMergedQrDisplay({ jobId }: ClientMergedQrDisplayProps) {
  const { session } = useAuth()
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrData, setQrData] = useState<MergedQrData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")

  // Fetch merged QR
  const fetchMergedQr = async () => {
    if (!session?.accessToken) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}/merged-qr`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        setQrData(result.data)
      } else if (response.status === 404) {
        setError("No hay códigos QR activos para este trabajo")
      } else {
        setError("Error al cargar el código QR")
      }
    } catch (err) {
      console.error("Error fetching merged QR:", err)
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh QR every 30 seconds if dynamic
  useEffect(() => {
    if (!showQrDialog || !qrData) return

    const hasDynamic = qrData.workCenters.some(wc => wc.qrType === 'dynamic')
    if (!hasDynamic) return

    const interval = setInterval(() => {
      fetchMergedQr()
    }, qrData.refreshInterval || 30000)

    return () => clearInterval(interval)
  }, [showQrDialog, qrData])

  // Countdown timer for dynamic QR
  useEffect(() => {
    if (!qrData?.expiresAt || !showQrDialog) {
      setTimeUntilExpiry("")
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const expiry = new Date(qrData.expiresAt!)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilExpiry("Actualizando...")
        fetchMergedQr()
        return
      }

      const seconds = Math.floor(diff / 1000)
      setTimeUntilExpiry(`${seconds}s`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [qrData?.expiresAt, showQrDialog])

  // Fetch on dialog open
  useEffect(() => {
    if (showQrDialog) {
      fetchMergedQr()
    }
  }, [showQrDialog])

  return (
    <>
      {/* QR Button in Navigation */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowQrDialog(true)}
        className="flex items-center gap-2"
      >
        <QrCode className="h-4 w-4" />
        <span className="hidden sm:inline">Código QR</span>
      </Button>

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Código QR - Fichaje de Trabajadores</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-[#6B21A8]" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchMergedQr} variant="outline" size="sm">
                Reintentar
              </Button>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              {/* QR Code Image */}
              <div className="flex flex-col items-center gap-3">
                <img 
                  src={qrData.qrImage} 
                  alt="Merged QR Code" 
                  className="w-64 h-64 border-2 border-gray-200 rounded-lg" 
                />
                
                {timeUntilExpiry && (
                  <div className="text-sm text-gray-600 font-medium">
                    Se actualiza en: <span className="text-[#6B21A8]">{timeUntilExpiry}</span>
                  </div>
                )}
              </div>

              {/* Work Centers List */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700">Centros de trabajo incluidos:</p>
                {qrData.workCenters.map((wc) => (
                  <div key={wc.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{wc.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      wc.qrType === 'static' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {wc.qrType === 'static' ? 'Estático' : 'Dinámico'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>Los trabajadores pueden escanear este código para fichar</p>
                <p>Este QR representa todos los centros de trabajo del proyecto</p>
              </div>

              {/* Refresh Button */}
              <Button
                onClick={fetchMergedQr}
                disabled={isLoading}
                className="w-full bg-[#6B21A8] hover:bg-[#581C87] text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar QR
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
