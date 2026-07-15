"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { loadGoogleMaps } from "@/lib/google-maps-loader"

declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}

interface GpsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string
  gpsData?: { active: boolean; latitude: number; longitude: number; radius: number }
  defaultLatitude?: number
  defaultLongitude?: number
  onUpdate: () => void
}

// Use Spanish/European thousand separator (".") instead of the US comma.
// e.g. 2759459 → "2.759.459"
const formatNumber = (n: number) => n.toLocaleString('es-ES')
const parseFormattedNumber = (s: string) => parseInt(s.replace(/\./g, ''), 10)

export function GpsDialog({ open, onOpenChange, workCenterId, gpsData, defaultLatitude, defaultLongitude, onUpdate }: GpsDialogProps) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const fallbackLat = Number(gpsData?.latitude) || defaultLatitude || 37.3891
  const fallbackLng = Number(gpsData?.longitude) || defaultLongitude || -5.9845
  const [latitude, setLatitude] = useState(fallbackLat)
  const [longitude, setLongitude] = useState(fallbackLng)
  const [radius, setRadius] = useState(Number(gpsData?.radius) || 100)
  const [radiusInput, setRadiusInput] = useState(formatNumber(Number(gpsData?.radius) || 100))
  const [active, setActive] = useState(gpsData?.active || false)
  const [isSaving, setIsSaving] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [dialogReady, setDialogReady] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const circleRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // Convert slider value to radius (logarithmic scale: 10m → 1000m → 20,000,000m)
  const sliderToRadius = (sliderValue: number): number => {
    if (sliderValue <= 50) {
      // First half: 10m to 1,000m (linear)
      return Math.round(10 + (sliderValue / 50) * 990)
    } else {
      // Second half: 1,000m to 20,000,000m (exponential)
      const t = (sliderValue - 50) / 50 // 0..1
      return Math.round(1000 * Math.pow(20000, t))
    }
  }

  // Convert radius to slider value
  const radiusToSlider = (radiusValue: number): number => {
    if (radiusValue <= 1000) {
      return Math.round(((radiusValue - 10) / 990) * 50)
    } else {
      // inverse of 1000 * 20000^t
      const t = Math.log(radiusValue / 1000) / Math.log(20000)
      return Math.round(50 + t * 50)
    }
  }

  // Calculate appropriate zoom level based on radius
  const getZoomFromRadius = (radiusMeters: number): number => {
    if (radiusMeters >= 10000000) return 2  // 10,000km+
    if (radiusMeters >= 5000000) return 3   // 5,000km+
    if (radiusMeters >= 2000000) return 4   // 2,000km+
    if (radiusMeters >= 500000) return 5    // 500km+
    if (radiusMeters >= 200000) return 7    // 200km+
    if (radiusMeters >= 100000) return 8    // 100km+
    if (radiusMeters >= 50000) return 9     // 50km+
    if (radiusMeters >= 20000) return 10    // 20km+
    if (radiusMeters >= 10000) return 11    // 10km+
    if (radiusMeters >= 5000) return 12     // 5km+
    if (radiusMeters >= 2000) return 13     // 2km+
    if (radiusMeters >= 1000) return 14     // 1km+
    if (radiusMeters >= 500) return 15      // 500m+
    if (radiusMeters >= 200) return 16      // 200m+
    if (radiusMeters >= 100) return 17      // 100m+
    return 18                                // <100m
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
      draggable: true, // Make marker draggable
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

    // Add click listener to map to change location
    googleMapRef.current.addListener('click', (event: any) => {
      const newLat = event.latLng.lat()
      const newLng = event.latLng.lng()
      
      // Update marker position
      markerRef.current.setPosition(event.latLng)
      
      // Update circle position
      circleRef.current.setCenter(event.latLng)
      
      // Update state
      setLatitude(newLat)
      setLongitude(newLng)
    })

    // Add drag listener to marker
    markerRef.current.addListener('dragend', (event: any) => {
      const newLat = event.latLng.lat()
      const newLng = event.latLng.lng()
      
      // Update circle position
      circleRef.current.setCenter(event.latLng)
      
      // Update state
      setLatitude(newLat)
      setLongitude(newLng)
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
    let cancelled = false
    loadGoogleMaps()
      .then(() => { if (!cancelled) setMapLoaded(true) })
      .catch(() => {})
    return () => { cancelled = true }
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

  // Reverse-geocode lat/lng into address components using Google Maps Geocoder
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) return null
    try {
      const geocoder = new window.google.maps.Geocoder()
      const result = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          if (status === "OK" && results?.[0]) resolve(results[0])
          else reject(status)
        })
      })

      const get = (type: string) =>
        result.address_components?.find((c: any) => c.types.includes(type))?.long_name || ""

      return {
        address: result.formatted_address || "",
        street: get("route"),
        streetNumber: get("street_number"),
        locality: get("locality") || get("sublocality") || get("administrative_area_level_2"),
        province: get("administrative_area_level_1"),
        country: get("country"),
        postalCode: get("postal_code"),
      }
    } catch {
      return null
    }
  }

  const handleSave = async () => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      // Reverse-geocode to get address fields from the marker coordinates
      const addressFields = await reverseGeocode(latitude, longitude)

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
            ...(addressFields || {}),
          }),
        }
      )

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      } else {
        toast({ title: t("gpsSaveError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving GPS config:", error)
      toast({ title: t("gpsSaveError"), variant: "destructive" })
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
                <p className="text-gray-500">{t("loadingMap")}</p>
              </div>
            )}
          </div>

          {/* Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label>{t("radius")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(e.target.value)}
                  onBlur={() => {
                    const value = parseFormattedNumber(radiusInput) || 10
                    const validValue = Math.max(10, Math.min(20000000, value))
                    setRadius(validValue)
                    setRadiusInput(formatNumber(validValue))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseFormattedNumber(radiusInput) || 10
                      const validValue = Math.max(10, Math.min(20000000, value))
                      setRadius(validValue)
                      setRadiusInput(formatNumber(validValue))
                      e.currentTarget.blur()
                    }
                  }}
                  className="w-36 h-8 text-sm text-right"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>
            <Slider
              value={[radiusToSlider(radius)]}
              onValueChange={(value) => {
                const newRadius = sliderToRadius(value[0])
                setRadius(newRadius)
                setRadiusInput(formatNumber(newRadius))
              }}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{t("activate")}</Label>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 ${
                active ? "bg-[#6B21A8]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                  active ? "translate-x-7" : "translate-x-0.5"
                }`}
              />
              <span className={`absolute text-[10px] font-medium transition-opacity ${
                active ? "left-1.5 text-white opacity-100" : "left-1.5 opacity-0"
              }`}>
                {t("yes")}
              </span>
              <span className={`absolute text-[10px] font-medium transition-opacity ${
                !active ? "right-1.5 text-gray-600 opacity-100" : "right-1.5 opacity-0"
              }`}>
                {t("no")}
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
              {t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
