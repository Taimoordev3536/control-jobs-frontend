"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { RefreshCw, QrCode as QrCodeIcon, Maximize2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

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

interface QrKioskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QrKioskDialog({ open, onOpenChange }: QrKioskDialogProps) {
  const { session } = useAuth()
  const [workCenters, setWorkCenters] = useState<Array<{ id: number; publicId?: string; name: string; qrImage?: string; expiresAt?: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // For portal rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch work centers with active QR codes for the client
  const fetchWorkCentersWithQr = async () => {
    if (!session?.accessToken) return
    
    setIsLoading(true)
    try {
      // Get all jobs for the client (which includes work centers)
      const jobsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/client/all-jobs`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      )

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        const jobs = jobsData.data || []

        // Extract unique work centers from all jobs
        const workCenterMap = new Map<number, { id: number; publicId?: string; name: string }>()
        jobs.forEach((job: any) => {
          if (job.workCenters && Array.isArray(job.workCenters)) {
            job.workCenters.forEach((wc: any) => {
              if (!workCenterMap.has(wc.id)) {
                workCenterMap.set(wc.id, { id: wc.id, publicId: wc.publicId, name: wc.name })
              }
            })
          }
        })

        const centers = Array.from(workCenterMap.values())

        if (centers.length === 0) {
          setWorkCenters([])
          setIsLoading(false)
          return
        }

        // Fetch QR codes for each work center
        const centersWithQr = await Promise.all(
          centers.map(async (wc: any) => {
            try {
              const qrResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${wc.publicId || wc.id}/qr-codes`,
                {
                  headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                  },
                }
              )

              if (qrResponse.ok) {
                const qrData = await qrResponse.json()
                const data = qrData.data

                // Use dynamic QR if selected, otherwise static
                const selectedQr = data.dynamicQr?.isSelected ? data.dynamicQr : 
                                  data.staticQr?.isSelected ? data.staticQr : null

                if (selectedQr && selectedQr.qrImage) {
                  return {
                    id: wc.id,
                    name: wc.name,
                    qrImage: selectedQr.qrImage,
                    expiresAt: selectedQr.expiresAt,
                  }
                }
              }
            } catch (error) {
              // Silently ignore
            }
            return null
          })
        )

        const finalCenters = centersWithQr.filter(Boolean)
        setWorkCenters(finalCenters as any)
      }
    } catch (error) {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch QR codes when dialog opens
  useEffect(() => {
    if (!open || !session?.accessToken) return
    fetchWorkCentersWithQr()
    
    // Auto-refresh every 2.5 minutes (before 3-minute expiry)
    const interval = setInterval(fetchWorkCentersWithQr, 150000)
    return () => clearInterval(interval)
  }, [open, session?.accessToken])

  // Update expiry countdown
  useEffect(() => {
    if (workCenters.length === 0) return

    const updateCountdown = () => {
      const firstWithExpiry = workCenters.find(wc => wc.expiresAt)
      if (!firstWithExpiry?.expiresAt) {
        setTimeUntilExpiry("")
        return
      }

      const now = new Date()
      const expiry = new Date(firstWithExpiry.expiresAt)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilExpiry("Expirado")
        fetchWorkCentersWithQr() // Refresh if expired
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeUntilExpiry(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [workCenters])

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Fullscreen kiosk mode content
  const kioskContent = (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ zIndex: 99999 }}>
      {/* Simple Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Códigos QR para Check-In</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchWorkCentersWithQr}
            disabled={isLoading}
            title="Refrescar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            title="Salir de Modo Kiosco"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area with more white space */}
      <div className="flex-1 overflow-auto p-12">
        {isLoading && workCenters.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <RefreshCw className="h-16 w-16 animate-spin text-[#6B21A8]" />
          </div>
        ) : workCenters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <QrCodeIcon className="h-20 w-20 mb-4 opacity-30 text-gray-400" />
            <p className="text-xl text-gray-600 dark:text-gray-400">No hay códigos QR activos</p>
            <p className="text-base text-gray-500 dark:text-gray-500 mt-2">Configure códigos QR en los centros de trabajo</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {timeUntilExpiry && (
              <div className="text-center bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <div className="text-2xl font-bold text-[#6B21A8] dark:text-purple-400">
                  Próxima actualización: {timeUntilExpiry}
                </div>
              </div>
            )}

            <div className={`grid gap-8 ${
              workCenters.length === 1 ? 'grid-cols-1 place-items-center' : 
              workCenters.length === 2 ? 'grid-cols-2' : 
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {workCenters.map((wc) => (
                <div 
                  key={wc.id} 
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center bg-white dark:bg-gray-800 shadow-lg"
                >
                  <h3 className="font-semibold text-xl mb-6 text-gray-900 dark:text-gray-100">{wc.name}</h3>
                  {wc.qrImage ? (
                    <div className="bg-white p-4 rounded-md inline-block">
                      <img 
                        src={wc.qrImage} 
                        alt={`QR Code - ${wc.name}`} 
                        className={`h-auto mx-auto ${
                          workCenters.length === 1 ? 'w-[350px]' : 'w-[280px]'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-72 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <p className="text-base text-gray-400">Sin QR activo</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    Centro de Trabajo #{wc.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Render fullscreen kiosk mode using portal to body
  if (isFullscreen && mounted) {
    return createPortal(kioskContent, document.body)
  }

  // Regular dialog mode (compact)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit max-h-[85vh] overflow-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-xl">Códigos QR para Check-In</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={fetchWorkCentersWithQr}
                disabled={isLoading}
                title="Refrescar"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleFullscreen}
                title="Modo Kiosco (Pantalla Completa)"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {isLoading && workCenters.length === 0 ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-12 w-12 animate-spin text-[#6B21A8]" />
            </div>
          ) : workCenters.length === 0 ? (
            <div className="text-center py-12">
              <QrCodeIcon className="h-16 w-16 mx-auto mb-4 opacity-30 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No hay códigos QR activos</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Configure códigos QR en los centros de trabajo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeUntilExpiry && (
                <div className="text-center bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                  <div className="text-base font-bold text-[#6B21A8] dark:text-purple-400">
                    Próxima actualización: {timeUntilExpiry}
                  </div>
                </div>
              )}

              <div className={`grid gap-4 ${
                workCenters.length === 1 ? 'grid-cols-1' : 
                workCenters.length === 2 ? 'grid-cols-2' : 
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {workCenters.map((wc) => (
                  <div 
                    key={wc.id} 
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center bg-white dark:bg-gray-800 flex flex-col items-center"
                  >
                    <h3 className="font-semibold text-base mb-3 text-gray-900 dark:text-gray-100">{wc.name}</h3>
                    {wc.qrImage ? (
                      <div className="bg-white p-3 rounded-md inline-block">
                        <img 
                          src={wc.qrImage} 
                          alt={`QR Code - ${wc.name}`} 
                          className="w-[200px] h-auto mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <p className="text-sm text-gray-400">Sin QR activo</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Centro de Trabajo #{wc.id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
