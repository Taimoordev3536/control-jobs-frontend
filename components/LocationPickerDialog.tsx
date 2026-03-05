"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { MapPin, Crosshair, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import type { AddressComponents } from "@/components/GoogleAddressInput"

declare global {
  interface Window {
    google: any
  }
}

interface LocationPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLocationSelect: (
    formattedAddress: string,
    components: AddressComponents
  ) => void
  /** Optional initial coordinates to centre on (e.g. existing work-center coords) */
  initialLat?: number | null
  initialLng?: number | null
}

export function LocationPickerDialog({
  open,
  onOpenChange,
  onLocationSelect,
  initialLat,
  initialLng,
}: LocationPickerDialogProps) {
  const { t } = useTranslation()

  // Map state
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState("")
  const [components, setComponents] = useState<AddressComponents>({})
  const [isLocating, setIsLocating] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [dialogReady, setDialogReady] = useState(false)

  // ---------------------------------------------------------------------------
  // Parse google geocoder result into AddressComponents
  // ---------------------------------------------------------------------------
  const parseGeocodeResult = useCallback(
    (result: any): {
      formatted: string
      comps: AddressComponents
    } => {
      const comps: AddressComponents = {}
      result.address_components?.forEach((c: any) => {
        const types = c.types
        if (types.includes("route")) comps.street = c.long_name
        else if (types.includes("street_number"))
          comps.streetNumber = c.long_name
        else if (types.includes("subpremise")) comps.floorDoor = c.long_name
        else if (types.includes("locality")) comps.city = c.long_name
        else if (types.includes("administrative_area_level_1"))
          comps.province = c.long_name
        else if (types.includes("country")) comps.country = c.long_name
        else if (types.includes("postal_code"))
          comps.postalCode = c.long_name
      })
      const loc = result.geometry?.location
      if (loc) {
        comps.latitude = loc.lat()
        comps.longitude = loc.lng()
      }
      return { formatted: result.formatted_address, comps }
    },
    []
  )

  // ---------------------------------------------------------------------------
  // Reverse-geocode a lat/lng and update UI state
  // ---------------------------------------------------------------------------
  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!geocoderRef.current) return
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results: any, status: any) => {
          if (
            status === window.google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            const { formatted, comps } = parseGeocodeResult(results[0])
            // Ensure coordinates are set even if geocoder geometry is slightly different
            comps.latitude = lat
            comps.longitude = lng
            setAddress(formatted)
            setComponents(comps)
          } else {
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
            setComponents({ latitude: lat, longitude: lng })
          }
        }
      )
    },
    [parseGeocodeResult]
  )

  // ---------------------------------------------------------------------------
  // Place marker + reverse geocode
  // ---------------------------------------------------------------------------
  const placeMarker = useCallback(
    (rawLat: number, rawLng: number) => {
      const lat = typeof rawLat === "string" ? parseFloat(rawLat) : rawLat
      const lng = typeof rawLng === "string" ? parseFloat(rawLng) : rawLng
      if (!isFinite(lat) || !isFinite(lng)) return
      setCoords({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng })
      }
      if (googleMapRef.current) {
        googleMapRef.current.panTo({ lat, lng })
      }
      reverseGeocode(lat, lng)
    },
    [reverseGeocode]
  )

  // ---------------------------------------------------------------------------
  // Get the browser's current position
  // ---------------------------------------------------------------------------
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        placeMarker(lat, lng)
        googleMapRef.current?.setZoom(17)
        setIsLocating(false)
      },
      (err) => {
        console.error("Geolocation error:", err)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [placeMarker])

  // ---------------------------------------------------------------------------
  // Dialog open/close lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open) {
      googleMapRef.current = null
      markerRef.current = null
      geocoderRef.current = null
      setMapReady(false)
      setDialogReady(false)
      setCoords(null)
      setAddress("")
      setComponents({})
    } else {
      const timer = setTimeout(() => setDialogReady(true), 350)
      return () => clearTimeout(timer)
    }
  }, [open])

  // ---------------------------------------------------------------------------
  // Initialise map once dialog is visible and google is available
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!dialogReady || !mapRef.current || !window.google?.maps || mapReady)
      return

    const parsedInitLat = initialLat != null ? parseFloat(String(initialLat)) : NaN
    const parsedInitLng = initialLng != null ? parseFloat(String(initialLng)) : NaN
    const hasInitCoords = isFinite(parsedInitLat) && isFinite(parsedInitLng)

    const defaultLat = hasInitCoords ? parsedInitLat : 40.4168 // Madrid
    const defaultLng = hasInitCoords ? parsedInitLng : -3.7038

    geocoderRef.current = new window.google.maps.Geocoder()

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    })
    googleMapRef.current = map

    // Trigger resize after dialog animation settles so tiles render
    setTimeout(() => {
      window.google.maps.event.trigger(map, "resize")
      map.setCenter({ lat: defaultLat, lng: defaultLng })
    }, 200)

    const marker = new window.google.maps.Marker({
      map,
      position: { lat: defaultLat, lng: defaultLng },
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    })
    markerRef.current = marker

    // Click on map → move marker
    map.addListener("click", (e: any) => {
      if (!e.latLng) return
      placeMarker(e.latLng.lat(), e.latLng.lng())
    })

    // Drag marker → update
    marker.addListener("dragend", () => {
      const pos = marker.getPosition()
      if (pos) placeMarker(pos.lat(), pos.lng())
    })

    setMapReady(true)

    // If we have initial coords, reverse-geocode them; otherwise auto-locate
    if (hasInitCoords) {
      placeMarker(parsedInitLat, parsedInitLng)
    } else {
      // Auto-detect current location on first open
      locateMe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogReady])

  // ---------------------------------------------------------------------------
  // Confirm selection
  // ---------------------------------------------------------------------------
  const handleConfirm = () => {
    onLocationSelect(address, components)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-[#6B21A8]" />
            {t("pickLocationFromMap") || "Seleccionar ubicación en el mapa"}
          </DialogTitle>
        </DialogHeader>

        {/* Map container */}
        <div className="relative w-full h-[400px] border-y border-border">
          <div ref={mapRef} className="w-full h-full" />

          {/* My-location FAB */}
          <button
            type="button"
            onClick={locateMe}
            disabled={isLocating}
            className="absolute bottom-3 right-3 z-10 bg-white dark:bg-gray-800 rounded-full shadow-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title={t("useCurrentLocation") || "Usar mi ubicación actual"}
          >
            {isLocating ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#6B21A8]" />
            ) : (
              <Crosshair className="h-5 w-5 text-[#6B21A8]" />
            )}
          </button>
        </div>

        {/* Selected address preview */}
        <div className="p-4 pt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("selectedAddress") || "Dirección seleccionada"}:
          </p>
          <p className="text-sm font-medium text-foreground min-h-[1.25rem]">
            {address || (
              <span className="text-muted-foreground italic">
                {t("clickMapOrLocate") ||
                  "Haz clic en el mapa o pulsa el botón de ubicación"}
              </span>
            )}
          </p>
          {coords && (
            <p className="text-xs text-muted-foreground">
              Lat: {coords.lat.toFixed(6)} &nbsp;|&nbsp; Lng:{" "}
              {coords.lng.toFixed(6)}
            </p>
          )}
        </div>

        <DialogFooter className="p-4 pt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel") || "Cancelar"}
          </Button>
          <Button
            disabled={!coords}
            onClick={handleConfirm}
            className="bg-[#6B21A8] hover:bg-[#5b1d91] text-white"
          >
            {t("confirmLocation") || "Confirmar ubicación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
