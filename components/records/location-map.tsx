"use client"

import { useEffect, useRef, useState } from "react"
import { loadGoogleMaps } from "@/lib/google-maps-loader"

/**
 * Read-only Google Map with a single marker — same JS Maps API flow used by the
 * work-center GPS dialog (dynamic script load, reuses any existing load).
 */
export default function LocationMap({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then(() => { if (!cancelled) setLoaded(true) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const w = window as any
    if (!loaded || !mapRef.current || !w.google?.maps) return
    const pos = { lat, lng }
    const map = new w.google.maps.Map(mapRef.current, {
      center: pos,
      zoom: 18,
      mapTypeId: "hybrid", // satellite imagery + street/place labels
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: true, // let the user toggle Map / Satellite
      mapTypeControlOptions: { position: w.google.maps.ControlPosition.TOP_LEFT },
      fullscreenControl: true,
      gestureHandling: "cooperative",
    })
    new w.google.maps.Marker({ position: pos, map })
  }, [loaded, lat, lng])

  return (
    <div className={className} ref={mapRef}>
      {!loaded && (
        <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">Cargando mapa…</div>
      )}
    </div>
  )
}
