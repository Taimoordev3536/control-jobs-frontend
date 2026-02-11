"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { QrCode, X, RefreshCw, Calendar, MapPin, Clock, Maximize2 } from "lucide-react"
import ControlJobsLogo from "../../../icons/Logos/ControlJobs.svg"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface WorkCenter {
  id: number
  name: string
  qrType: 'static' | 'dynamic'
  address: string
}

interface ScheduledJob {
  id: number
  jobName: string
}

interface TodayMergedQrData {
  qrImage: string
  mergedToken: string
  workCenters: WorkCenter[]
  expiresAt: string | null
  refreshInterval: number
  generatedAt: string
  scheduledJobs?: ScheduledJob[]
  clientName?: string
}

interface ClientTodayMergedQrDisplayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientTodayMergedQrDisplay({
  open,
  onOpenChange,
}: ClientTodayMergedQrDisplayProps) {
  const { session } = useAuth()
  const [qrData, setQrData] = useState<TodayMergedQrData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // For portal rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Enter/exit browser fullscreen API & hide body scroll
  useEffect(() => {
    if (!mounted) return

    if (isFullscreen) {
      // Hide body scrollbar
      document.body.style.overflow = 'hidden'
      // Request browser native fullscreen (hides chrome, address bar, taskbar)
      document.documentElement.requestFullscreen?.().catch(() => {
        // Fallback: some browsers may block without user gesture
        console.log('Fullscreen API not available, using CSS fallback')
      })
    } else {
      // Restore body scrollbar
      document.body.style.overflow = ''
      // Exit browser native fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullscreen, mounted])

  // Listen for ESC exiting browser fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFullscreen])

  // Fetch today's merged QR
  const fetchTodayQr = async () => {
    if (!session?.accessToken) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/client/today-merged-qr`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        setQrData(result.data)
        console.log("✅ Today's QR loaded:", result.data)
      } else if (response.status === 404) {
        const errorData = await response.json()
        if (errorData.details?.error === 'NO_JOBS_TODAY') {
          setError("No hay trabajos programados para hoy")
        } else if (errorData.details?.error === 'NO_ACTIVE_QR') {
          setError("No hay códigos QR activos para los trabajos de hoy")
        } else {
          setError("No hay códigos QR disponibles")
        }
      } else {
        setError("Error al cargar el código QR")
      }
    } catch (err) {
      console.error("Error fetching today's QR:", err)
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh QR every 30 seconds if dynamic
  useEffect(() => {
    if ((!open && !isFullscreen) || !qrData) return

    const hasDynamic = qrData.workCenters.some(wc => wc.qrType === 'dynamic')
    if (!hasDynamic) return

    const interval = setInterval(() => {
      fetchTodayQr()
    }, qrData.refreshInterval || 30000)

    return () => clearInterval(interval)
  }, [open, isFullscreen, qrData])

  // Countdown timer for dynamic QR
  useEffect(() => {
    if (!qrData?.expiresAt || (!open && !isFullscreen)) {
      setTimeUntilExpiry("")
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const expiry = new Date(qrData.expiresAt!)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilExpiry("Actualizando...")
        fetchTodayQr()
        return
      }

      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60

      if (minutes > 0) {
        setTimeUntilExpiry(`${minutes}m ${remainingSeconds}s`)
      } else {
        setTimeUntilExpiry(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [qrData?.expiresAt, open, isFullscreen])

  // Fetch on dialog open
  useEffect(() => {
    if (open) {
      fetchTodayQr()
    }
  }, [open])

  const hasDynamicQr = qrData?.workCenters.some(wc => wc.qrType === 'dynamic')

  // Fullscreen/Kiosk QR View - matches design image
  const fullscreenView = isFullscreen && mounted && qrData ? (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden p-8 dark:bg-[#2d3748]"
      style={{ width: '100vw', height: '100dvh', top: 0, left: 0, margin: 0, backgroundColor: '#a6a6a6' }}
    >
      {/* Close button */}
      <button
        onClick={() => setIsFullscreen(false)}
        className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-[#475569]/90 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-[#475569] transition-colors z-10 shadow-lg"
        aria-label="Exit fullscreen"
      >
        <X className="w-6 h-6 text-gray-700 dark:text-gray-100" />
      </button>

      {/* Content container */}
      <div className="flex flex-col items-center w-full max-w-md gap-6">
        {/* Job Names Card */}
        {qrData.scheduledJobs && qrData.scheduledJobs.length > 0 && (
          <div className="w-full bg-white dark:bg-[#3b4556] px-6 py-5 text-center shadow-lg">
            {qrData.scheduledJobs.map((job, idx) => (
              <div key={idx} className="font-bold text-gray-900 dark:text-white text-xl uppercase tracking-tight">
                {job.jobName}
              </div>
            ))}
            {/* Work Centers below job name */}
            {qrData.workCenters && qrData.workCenters.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-500">
                {qrData.workCenters.map((wc, idx) => (
                  <div key={idx} className="font-medium text-gray-600 dark:text-gray-200 text-sm uppercase">
                    {wc.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR Code Card */}
        <div className="w-full bg-white dark:bg-[#3b4556] p-6 flex items-center justify-center shadow-lg">
          <img
            src={qrData.qrImage}
            alt="QR Code"
            className="dark:invert"
            style={{ width: 'min(60vw, 60vh, 400px)', height: 'min(60vw, 60vh, 400px)' }}
          />
        </div>

        {/* Client Name Card */}
        {qrData.clientName && (
          <div className="w-full bg-white dark:bg-[#3b4556] px-6 py-5 text-center shadow-lg">
            <p className="font-bold text-gray-900 dark:text-white text-lg uppercase tracking-tight">{qrData.clientName}</p>
          </div>
        )}

        {/* Timer - subtle, outside cards */}
        {hasDynamicQr && timeUntilExpiry && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Clock className="w-3 h-3" />
            <span>Se actualiza en: {timeUntilExpiry}</span>
          </div>
        )}
      </div>

      {/* Powered by - at bottom */}
      <div className="absolute bottom-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <span>Powered by</span>
        <span className="font-semibold text-gray-900 dark:text-white">Control</span><span className="font-semibold text-[#6B21A8] dark:text-[#a78bfa]">Jobs</span>
      </div>
    </div>
  ) : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md [&>button]:hidden p-0 overflow-hidden">
          {/* Custom Header with Maximize Button */}
          <div className="absolute right-0 top-0 flex items-center gap-1 z-50">
            {qrData && !isLoading && !error && (
              <button
                onClick={() => { setIsFullscreen(true); onOpenChange(false); }}
                className="p-1 hover:bg-white dark:hover:bg-[#475569]"
                title="Vista de pantalla completa"
              >
                <Maximize2 className="h-4 w-4 text-gray-700 dark:text-gray-100" />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-white dark:hover:bg-[#475569]"
            >
              <X className="h-4 w-4 text-gray-700 dark:text-gray-100" />
            </button>
          </div>

          {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-[#6B21A8] dark:text-[#a78bfa] mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Cargando código QR...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center px-6">
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
            </div>
            <Button onClick={fetchTodayQr} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        ) : qrData ? (
          <div className="flex flex-col items-center p-8 pt-10 dark:bg-[#2d3748]" style={{ backgroundColor: '#a6a6a6' }}>
            {/* Job Names Card */}
            {qrData.scheduledJobs && qrData.scheduledJobs.length > 0 && (
              <div className="w-full bg-white dark:bg-[#3b4556] px-4 py-4 mb-4 text-center shadow">
                {qrData.scheduledJobs.map((job, idx) => (
                  <div key={idx} className="font-bold text-gray-900 dark:text-white text-base uppercase tracking-tight">
                    {job.jobName}
                  </div>
                ))}
                {/* Work Centers below job name */}
                {qrData.workCenters && qrData.workCenters.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-500">
                    {qrData.workCenters.map((wc, idx) => (
                      <div key={idx} className="font-medium text-gray-600 dark:text-gray-200 text-xs uppercase">
                        {wc.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QR Code Card */}
            <div className="w-full bg-white dark:bg-[#3b4556] p-4 mb-4 flex items-center justify-center shadow">
              <img
                src={qrData.qrImage}
                alt="QR Code"
                className="w-48 h-48 dark:invert"
              />
            </div>

            {/* Client Name Card */}
            {qrData.clientName && (
              <div className="w-full bg-white dark:bg-[#3b4556] px-4 py-4 mb-4 text-center shadow">
                <p className="font-bold text-gray-900 dark:text-white text-base uppercase tracking-tight">{qrData.clientName}</p>
              </div>
            )}

            {/* Timer - subtle */}
            {hasDynamicQr && timeUntilExpiry && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mb-3">
                <Clock className="w-3 h-3" />
                <span>Se actualiza en: {timeUntilExpiry}</span>
              </div>
            )}

            {/* Powered by ControlJobs */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-700 dark:text-gray-200">
              <span>Powered by</span>
              <ControlJobsLogo className="h-5 w-20" />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>

    {/* Fullscreen Portal */}
    {mounted && isFullscreen && createPortal(fullscreenView, document.body)}
    </>
  )
}
