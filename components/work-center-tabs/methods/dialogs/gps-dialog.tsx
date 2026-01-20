"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/hooks/use-auth"

declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}

interface GpsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: number
  gpsData?: { active: boolean; latitude: number; longitude: number; radius: number }
  onUpdate: () => void
}

export function GpsDialog({ open, onOpenChange, workCenterId, gpsData, onUpdate }: GpsDialogProps) {
  const { session } = useAuth()
  const [latitude, setLatitude] = useState(gpsData?.latitude || 37.3891)
  const [longitude, setLongitude] = useState(gpsData?.longitude || -5.9845)
  const [radius, setRadius] = useState(gpsData?.radius || 100)
  const [radiusInput, setRadiusInput] = useState(String(gpsData?.radius || 100))
  const [active, setActive] = useState(gpsData?.active || false)
  const [isSaving, setIsSaving] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [dialogReady, setDialogReady] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const circleRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // Convert slider value to radius (logarithmic scale)
  const sliderToRadius = (sliderValue: number): number => {
    if (sliderValue <= 50) {
      // First half: 10m to 1000m (linear)
      return Math.round(10 + (sliderValue / 50) * 990)
    } else {
      // Second half: 1000m to 1000000m (linear)
      return Math.round(1000 + ((sliderValue - 50) / 50) * 999000)
    }
  }

  // Convert radius to slider value
  const radiusToSlider = (radiusValue: number): number => {
    if (radiusValue <= 1000) {
      return Math.round((radiusValue - 10) / 990 * 50)
    } else {
      return Math.round(50 + ((radiusValue - 1000) / 999000) * 50)
    }
  }

  // Calculate appropriate zoom level based on radius
  const getZoomFromRadius = (radiusMeters: number): number => {
    // Approximate zoom levels for different radius sizes
    if (radiusMeters >= 500000) return 5   // 500km+
    if (radiusMeters >= 200000) return 7   // 200km+
    if (radiusMeters >= 100000) return 8   // 100km+
    if (radiusMeters >= 50000) return 9    // 50km+
    if (radiusMeters >= 20000) return 10   // 20km+
    if (radiusMeters >= 10000) return 11   // 10km+
    if (radiusMeters >= 5000) return 12    // 5km+
    if (radiusMeters >= 2000) return 13    // 2km+
    if (radiusMeters >= 1000) return 14    // 1km+
    if (radiusMeters >= 500) return 15     // 500m+
    if (radiusMeters >= 200) return 16     // 200m+
    if (radiusMeters >= 100) return 17     // 100m+
    return 18                               // <100m
  }

  // Reset map refs when dialog closes
  useEffect(() => {
    if (!open) {
      googleMapRef.current = null
      circleRef.current = null
      markerRef.current = null
      setMapInitialized(false)
      setDialogReady(false)
    } else {
      // Wait for dialog to be fully visible
      const timer = setTimeout(() => {
        setDialogReady(true)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [open])

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || mapInitialized) return
    
    // Check if container has dimensions
    const rect = mapRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      console.log('Map container has no dimensions, skipping init')
      return
    }

    const center = { lat: latitude, lng: longitude }

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: getZoomFromRadius(radius),
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: window.google.maps.ControlPosition.TOP_LEFT,
      },
    })

    // Add marker
    markerRef.current = new window.google.maps.Marker({
      position: center,
      map: googleMapRef.current,
      title: "Centro de trabajo",
    })

    // Add circle
    circleRef.current = new window.google.maps.Circle({
      map: googleMapRef.current,
      center,
      radius,
      fillColor: "#FF0000",
      fillOpacity: 0.35,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
    })

    // Trigger resize after a short delay to ensure tiles render properly
    setTimeout(() => {
      if (googleMapRef.current && window.google?.maps) {
        window.google.maps.event.trigger(googleMapRef.current, 'resize')
        googleMapRef.current.setCenter(center)
      }
    }, 200)

    setMapInitialized(true)
  }, [latitude, longitude, radius, mapInitialized])

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius)
    }
    if (googleMapRef.current) {
      const newZoom = getZoomFromRadius(radius)
      googleMapRef.current.setZoom(newZoom)
    }
  }, [radius])

  // Load Google Maps Script
  useEffect(() => {
    if (!open) return

    const loadGoogleMaps = () => {
      // Check if already loaded
      if (window.google?.maps) {
        setMapLoaded(true)
        return
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => setMapLoaded(true))
        return
      }

      // Create callback
      window.initGoogleMap = () => {
        setMapLoaded(true)
      }

      // Load script
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initGoogleMap`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [open])

  // Initialize map when loaded
  useEffect(() => {
    if (mapLoaded && open && dialogReady && mapRef.current && !mapInitialized) {
      // Try to initialize, with retries if container not ready
      const tryInit = (retries = 0) => {
        if (retries > 5) return
        
        const rect = mapRef.current?.getBoundingClientRect()
        if (!rect || rect.width === 0 || rect.height === 0) {
          setTimeout(() => tryInit(retries + 1), 100)
          return
        }
        
        initializeMap()
      }
      
      tryInit()
    }
  }, [mapLoaded, open, dialogReady, initializeMap, mapInitialized])

  const handleSave = async () => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/signing-methods/gps`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active,
            latitude,
            longitude,
            radius,
          }),
        }
      )

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      } else {
        alert("Error al guardar la configuración GPS")
      }
    } catch (error) {
      console.error("Error saving GPS config:", error)
      alert("Error al guardar la configuración GPS")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">GPS</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Google Map */}
          <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-gray-100">
            <div 
              ref={mapRef} 
              className="w-full h-full"
              style={{ minHeight: "300px" }}
            />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Cargando mapa...</p>
              </div>
            )}
          </div>

          {/* Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label>Radio</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(e.target.value)}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 10
                    const validValue = Math.max(10, Math.min(1000000, value))
                    setRadius(validValue)
                    setRadiusInput(String(validValue))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseInt(radiusInput) || 10
                      const validValue = Math.max(10, Math.min(1000000, value))
                      setRadius(validValue)
                      setRadiusInput(String(validValue))
                      e.currentTarget.blur()
                    }
                  }}
                  min={10}
                  max={1000000}
                  className="w-24 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>
            <Slider
              value={[radiusToSlider(radius)]}
              onValueChange={(value) => {
                const newRadius = sliderToRadius(value[0])
                setRadius(newRadius)
                setRadiusInput(String(newRadius))
              }}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

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
